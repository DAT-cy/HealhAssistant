package health_assistant.module.workout.service;

import health_assistant.module.coach.entity.RoadmapPlanSlot;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.RoadmapPlanSlotRepository;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.workout.dto.ActivityLocationPoint;
import health_assistant.module.workout.dto.ActivitySessionResponse;
import health_assistant.module.workout.dto.FinishActivitySessionRequest;
import health_assistant.module.workout.entity.ActivitySession;
import health_assistant.module.workout.repository.ActivitySessionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ActivitySessionService {
    private static final Set<String> TRACKED_TYPES = Set.of("RUNNING", "WALKING");
    private static final List<String> ACTIVE_STATES = List.of("IN_PROGRESS", "PAUSED");
    private static final double EARTH_RADIUS_METERS = 6_371_000.0;
    private static final double MAX_GPS_ACCURACY_METERS = 30.0;
    private static final double MAX_PLAUSIBLE_SPEED_MPS = 12.0;
    private static final long MAX_GPS_GAP_SECONDS = 60;

    private final RoadmapRecordRepository roadmapRepository;
    private final RoadmapPlanSlotRepository slotRepository;
    private final ActivitySessionRepository sessionRepository;

    @Transactional
    public ActivitySessionResponse start(Long userId, Long roadmapId, Long slotId) {
        RoadmapRecord roadmap = ownedActiveRoadmap(userId, roadmapId);
        RoadmapPlanSlot slot = slotRepository.findByIdAndRoadmapIdForUpdate(slotId, roadmapId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khung giờ trong lộ trình này."));
        if (!TRACKED_TYPES.contains(slot.getActivityType())) {
            throw new IllegalArgumentException("Theo dõi GPS chỉ hỗ trợ chạy bộ và đi bộ.");
        }
        ActivitySession active = sessionRepository.findFirstByPlanSlotIdAndStatusInOrderByStartedAtDesc(slotId, ACTIVE_STATES).orElse(null);
        if (active != null) return toResponse(active);
        String slotStatus = normalize(slot.getStatus());
        if (!"UPCOMING".equals(slotStatus) && !"IN_PROGRESS".equals(slotStatus)) {
            throw new IllegalArgumentException("Khung giờ đã kết thúc và không thể bắt đầu lại.");
        }

        Instant now = Instant.now();
        ActivitySession session = new ActivitySession();
        session.setUserId(userId);
        session.setRoadmapId(roadmapId);
        session.setPlanSlotId(slotId);
        session.setActivityType(slot.getActivityType());
        session.setStatus("IN_PROGRESS");
        session.setStartedAt(now);
        session.setDurationSource("TIMER");
        slot.setStatus("IN_PROGRESS");
        if (slot.getStartedAt() == null) slot.setStartedAt(now);
        slotRepository.saveAndFlush(slot);
        return toResponse(sessionRepository.saveAndFlush(session));
    }

    @Transactional
    public ActivitySessionResponse pause(Long userId, Long sessionId) {
        LockedSession locked = lockSessionAndSlot(userId, sessionId);
        ActivitySession session = locked.session();
        if ("PAUSED".equals(session.getStatus())) return toResponse(session);
        requireSessionStatus(session, "IN_PROGRESS", "Chỉ có thể tạm dừng hoạt động đang chạy.");
        session.setStatus("PAUSED");
        session.setPausedAt(Instant.now());
        return toResponse(sessionRepository.saveAndFlush(session));
    }

    @Transactional
    public ActivitySessionResponse resume(Long userId, Long sessionId) {
        LockedSession locked = lockSessionAndSlot(userId, sessionId);
        ActivitySession session = locked.session();
        if ("IN_PROGRESS".equals(session.getStatus())) return toResponse(session);
        requireSessionStatus(session, "PAUSED", "Chỉ có thể tiếp tục hoạt động đang tạm dừng.");
        if (session.getPausedAt() != null) {
            session.setPausedSeconds(session.getPausedSeconds() + Math.max(0, Duration.between(session.getPausedAt(), Instant.now()).toSeconds()));
        }
        session.setPausedAt(null);
        session.setStatus("IN_PROGRESS");
        return toResponse(sessionRepository.saveAndFlush(session));
    }

    @Transactional
    public ActivitySessionResponse finish(Long userId, Long sessionId, FinishActivitySessionRequest request) {
        LockedSession locked = lockSessionAndSlot(userId, sessionId);
        ActivitySession session = locked.session();
        if ("COMPLETED".equals(session.getStatus())) return toResponse(session);
        if ("CANCELLED".equals(session.getStatus())) throw new IllegalArgumentException("Hoạt động đã hủy không thể hoàn thành.");
        if (!ACTIVE_STATES.contains(session.getStatus())) throw new IllegalArgumentException("Trạng thái hoạt động không hợp lệ.");

        Instant endedAt = Instant.now();
        long activeSeconds = request.manualDurationSeconds() == null ? activeDurationSeconds(session, endedAt) : request.manualDurationSeconds();
        if (request.manualDurationSeconds() != null && (activeSeconds < 1 || activeSeconds > 86400)) {
            throw new IllegalArgumentException("Thời lượng thủ công phải từ 1 giây đến 24 giờ.");
        }

        GpsMeasurement gps = measureGps(session, endedAt, request.gpsSamples());
        Double distanceMeters = gps.distanceMeters();
        String distanceSource = "GPS";
        if (distanceMeters == null) {
            if (request.manualDistanceMeters() != null) {
                validateManualDistance(request.manualDistanceMeters());
                distanceMeters = request.manualDistanceMeters();
                distanceSource = "MANUAL";
            } else {
                distanceSource = "UNAVAILABLE";
            }
        }

        Integer steps = request.sensorSteps();
        String stepsSource = "SENSOR";
        if (steps == null && request.manualSteps() != null) {
            if (request.manualSteps() < 0 || request.manualSteps() > 200_000) throw new IllegalArgumentException("Số bước nhập tay không hợp lệ.");
            steps = request.manualSteps();
            stepsSource = "MANUAL";
        } else if (steps == null) {
            stepsSource = "UNAVAILABLE";
        } else if (steps < 0 || steps > 200_000) {
            throw new IllegalArgumentException("Dữ liệu cảm biến bước chân không hợp lệ.");
        }

        session.setStatus("COMPLETED");
        session.setEndedAt(endedAt);
        session.setPausedAt(null);
        session.setDurationSeconds(activeSeconds);
        session.setDurationSource(request.manualDurationSeconds() == null ? "TIMER" : "MANUAL");
        session.setDistanceMeters(distanceMeters);
        session.setDistanceSource(distanceSource);
        session.setSteps(steps);
        session.setStepsSource(stepsSource);
        session.setGpsSampleCount(gps.sampleCount());
        session.setPaceSecondsPerKm(pace(activeSeconds, distanceMeters));
        session.setAverageSpeedKmh(averageSpeed(activeSeconds, distanceMeters));
        session.setNotes(blankToNull(request.notes()));
        ActivitySession completed = sessionRepository.saveAndFlush(session);

        RoadmapPlanSlot slot = locked.slot();
        slot.setStatus("COMPLETED");
        slot.setCompletedAt(endedAt);
        slot.setActualDurationMinutes(Math.toIntExact((activeSeconds + 59) / 60));
        slot.setNotes(blankToNull(request.notes()));
        slotRepository.saveAndFlush(slot);
        return toResponse(completed);
    }

    @Transactional
    public ActivitySessionResponse cancel(Long userId, Long sessionId) {
        LockedSession locked = lockSessionAndSlot(userId, sessionId);
        ActivitySession session = locked.session();
        if ("CANCELLED".equals(session.getStatus())) return toResponse(session);
        if ("COMPLETED".equals(session.getStatus())) throw new IllegalArgumentException("Hoạt động đã hoàn thành không thể hủy.");
        Instant now = Instant.now();
        session.setDurationSeconds(activeDurationSeconds(session, now));
        session.setEndedAt(now);
        session.setPausedAt(null);
        session.setStatus("CANCELLED");
        ActivitySession cancelled = sessionRepository.saveAndFlush(session);

        RoadmapPlanSlot slot = locked.slot();
        if ("IN_PROGRESS".equals(slot.getStatus())) {
            slot.setStatus("UPCOMING");
            slot.setStartedAt(null);
            slotRepository.saveAndFlush(slot);
        }
        return toResponse(cancelled);
    }

    @Transactional(readOnly = true)
    public List<ActivitySessionResponse> history(Long userId, Long roadmapId, Long slotId) {
        RoadmapRecord roadmap = roadmapRepository.findByIdAndUserId(roadmapId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy lộ trình của tài khoản này."));
        RoadmapPlanSlot slot = slotRepository.findByIdAndRoadmap_Id(slotId, roadmap.getId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khung giờ trong lộ trình này."));
        return sessionRepository.findTop10ByPlanSlotIdAndUserIdOrderByStartedAtDesc(slot.getId(), userId).stream()
                .map(this::toResponse).toList();
    }

    private GpsMeasurement measureGps(ActivitySession session, Instant endedAt, List<ActivityLocationPoint> points) {
        if (points == null || points.size() < 2) return new GpsMeasurement(null, 0);
        if (points.size() > 5000) throw new IllegalArgumentException("Dữ liệu GPS vượt giới hạn số điểm.");
        List<ValidPoint> accepted = new ArrayList<>();
        long previousTimestamp = -1;
        for (ActivityLocationPoint point : points) {
            if (point == null) continue;
            if (!Double.isFinite(point.latitude()) || !Double.isFinite(point.longitude()) || !Double.isFinite(point.accuracyMeters())) continue;
            if (point.latitude() < -90 || point.latitude() > 90 || point.longitude() < -180 || point.longitude() > 180) continue;
            if (point.accuracyMeters() < 0 || point.accuracyMeters() > 100) continue;
            if (point.timestampEpochMillis() < session.getStartedAt().toEpochMilli()
                    || point.timestampEpochMillis() > endedAt.toEpochMilli() + 5000) continue;
            if (point.timestampEpochMillis() <= previousTimestamp) continue;
            previousTimestamp = point.timestampEpochMillis();
            if (point.accuracyMeters() <= MAX_GPS_ACCURACY_METERS) {
                accepted.add(new ValidPoint(point.timestampEpochMillis(), point.latitude(), point.longitude()));
            }
        }
        if (accepted.size() < 2) return new GpsMeasurement(null, accepted.size());

        double totalMeters = 0;
        int usedSegments = 0;
        for (int index = 1; index < accepted.size(); index++) {
            ValidPoint previous = accepted.get(index - 1);
            ValidPoint current = accepted.get(index);
            double seconds = (current.timestampEpochMillis() - previous.timestampEpochMillis()) / 1000.0;
            if (seconds <= 0 || seconds > MAX_GPS_GAP_SECONDS) continue;
            double segmentMeters = haversineMeters(previous.latitude(), previous.longitude(), current.latitude(), current.longitude());
            if (segmentMeters < 1.0 || segmentMeters / seconds > MAX_PLAUSIBLE_SPEED_MPS) continue;
            totalMeters += segmentMeters;
            usedSegments++;
        }
        if (usedSegments == 0 || totalMeters <= 0 || totalMeters > 500_000) return new GpsMeasurement(null, accepted.size());
        return new GpsMeasurement(totalMeters, accepted.size());
    }

    private double haversineMeters(double latitude1, double longitude1, double latitude2, double longitude2) {
        double lat1 = Math.toRadians(latitude1);
        double lat2 = Math.toRadians(latitude2);
        double deltaLat = Math.toRadians(latitude2 - latitude1);
        double deltaLon = Math.toRadians(longitude2 - longitude1);
        double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private long activeDurationSeconds(ActivitySession session, Instant end) {
        long seconds = Math.max(0, Duration.between(session.getStartedAt(), end).toSeconds() - session.getPausedSeconds());
        if ("PAUSED".equals(session.getStatus()) && session.getPausedAt() != null) {
            seconds = Math.max(0, seconds - Duration.between(session.getPausedAt(), end).toSeconds());
        }
        return Math.min(seconds, 86_400);
    }

    private Double pace(long durationSeconds, Double distanceMeters) {
        return distanceMeters == null || distanceMeters <= 0 || durationSeconds <= 0 ? null : durationSeconds / (distanceMeters / 1000.0);
    }

    private Double averageSpeed(long durationSeconds, Double distanceMeters) {
        return distanceMeters == null || distanceMeters <= 0 || durationSeconds <= 0 ? null
                : distanceMeters / 1000.0 / (durationSeconds / 3600.0);
    }

    private void validateManualDistance(double distance) {
        if (!Double.isFinite(distance) || distance < 0 || distance > 500_000) throw new IllegalArgumentException("Quãng đường nhập tay phải từ 0 đến 500.000 mét.");
    }

    private RoadmapRecord ownedActiveRoadmap(Long userId, Long roadmapId) {
        RoadmapRecord roadmap = roadmapRepository.findByIdAndUserId(roadmapId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy lộ trình của tài khoản này."));
        if (!"ACTIVE".equals(roadmap.getStatus())) throw new IllegalArgumentException("Chỉ có thể theo dõi hoạt động trong lộ trình đang chạy.");
        return roadmap;
    }

    private LockedSession lockSessionAndSlot(Long userId, Long sessionId) {
        ActivitySession snapshot = sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy phiên hoạt động của tài khoản này."));
        RoadmapRecord roadmap = ownedActiveRoadmap(userId, snapshot.getRoadmapId());
        RoadmapPlanSlot slot = slotRepository.findByIdAndRoadmapIdForUpdate(snapshot.getPlanSlotId(), snapshot.getRoadmapId())
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy khung giờ của hoạt động."));
        ActivitySession session = sessionRepository.findByIdAndUserIdForUpdate(sessionId, userId)
                .orElseThrow(() -> new EntityNotFoundException("Không tìm thấy phiên hoạt động của tài khoản này."));
        return new LockedSession(session, roadmap, slot);
    }

    private void requireSessionStatus(ActivitySession session, String required, String message) {
        if (!required.equals(session.getStatus())) throw new IllegalArgumentException(message);
    }

    private String normalize(String status) { return "PLANNED".equals(status) ? "UPCOMING" : status; }

    private String blankToNull(String notes) { return notes == null || notes.isBlank() ? null : notes.trim(); }

    private ActivitySessionResponse toResponse(ActivitySession session) {
        return new ActivitySessionResponse(session.getId(), session.getRoadmapId(), session.getPlanSlotId(), session.getActivityType(),
                session.getStatus(), session.getStartedAt(), session.getEndedAt(), session.getDurationSeconds(),
                session.getDistanceMeters(), session.getSteps(), session.getPaceSecondsPerKm(), session.getAverageSpeedKmh(),
                session.getDistanceSource(), session.getStepsSource(), session.getDurationSource(), session.getGpsSampleCount(), session.getNotes());
    }

    private record ValidPoint(long timestampEpochMillis, double latitude, double longitude) {}
    private record GpsMeasurement(Double distanceMeters, int sampleCount) {}
    private record LockedSession(ActivitySession session, RoadmapRecord roadmap, RoadmapPlanSlot slot) {}
}
