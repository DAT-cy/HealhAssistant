package health_assistant.module.coach.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.access.service.FeatureAccessService;
import health_assistant.module.coach.dto.*;
import health_assistant.module.coach.entity.CoachChatMessage;
import health_assistant.module.coach.entity.RoadmapRecord;
import health_assistant.module.coach.repository.*;
import health_assistant.module.knowledge.entity.KnowledgeChunk;
import health_assistant.module.knowledge.repository.KnowledgeChunkRepository;
import health_assistant.module.nutrition.repository.MealLogRepository;
import health_assistant.module.personalassistant.dto.PersonalAssistantSource;
import health_assistant.module.personalassistant.entity.PersonalAssistantProfile;
import health_assistant.module.personalassistant.entity.PersonalKnowledgeChunk;
import health_assistant.module.personalassistant.entity.PersonalKnowledgeDocument;
import health_assistant.module.personalassistant.repository.*;
import health_assistant.module.profile.entity.UserProfile;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.workout.repository.ActivitySessionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class CoachChatConversationService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Pattern WORDS = Pattern.compile("[\\p{L}\\p{N}]{3,}");
    private static final String PERSONAL_PREMIUM = "AI_PERSONAL_ASSISTANT";
    private final CoachChatService chatService;
    private final PlanRescheduleService rescheduleService;
    private final UserProfileRepository profileRepository;
    private final RoadmapRecordRepository roadmapRepository;
    private final RoadmapPlanSlotRepository slotRepository;
    private final ActivitySessionRepository activityRepository;
    private final MealLogRepository mealRepository;
    private final DailyAiReviewRepository reviewRepository;
    private final KnowledgeChunkRepository sharedChunkRepository;
    private final PersonalAssistantProfileRepository personalProfileRepository;
    private final PersonalKnowledgeDocumentRepository personalDocumentRepository;
    private final PersonalKnowledgeChunkRepository personalChunkRepository;
    private final CoachChatMessageRepository messageRepository;
    private final FeatureAccessService accessService;
    private final ObjectMapper objectMapper;
    private final Map<Long, Deque<Long>> callsByUser = new ConcurrentHashMap<>();

    @Transactional
    public CoachChatResponse reply(Long userId, CoachChatRequest request) {
        enforceRateLimit(userId);
        String question = request.message().trim();
        String threadId = threadId(request.threadId());
        UserProfile profile = profileRepository.findByUserId(userId).filter(UserProfile::isConsent).orElse(null);
        Retrieval retrieval = retrieve(userId, question, request.allowPersonalKnowledge());
        List<CoachChatMessage> history = messageRepository.findTop100ByUserIdAndThreadIdOrderByCreatedAtAsc(userId, threadId);
        String context = buildContext(userId, question, retrieval, history);
        CoachChatResponse generated = chatService.reply(question, profile, context);

        PlanReschedulePreviewResponse proposal = null;
        boolean requestedReschedule = !generated.safetyEscalation() && requestsReschedule(question);
        if (requestedReschedule) {
            RoadmapRecord active = roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE").orElse(null);
            if (active != null) {
                try {
                    proposal = rescheduleService.preview(userId, new PlanRescheduleRequest(active.getId(), "REMAINING_DAYS",
                            LocalDate.now(ZONE), null, null, question, List.of(1, 2, 3, 4, 5, 6, 7), null, null,
                            null, null, null, null, null, null, question.substring(0, Math.min(question.length(), 300))));
                } catch (RuntimeException ignored) {
                    // Chat still answers; schedule remains unchanged and the existing preview API reports validation detail.
                }
            }
        }

        Instant now = Instant.now();
        CoachChatMessage userRow = message(userId, threadId, "USER", question, null, List.of());
        CoachChatMessage assistantRow = message(userId, threadId, "ASSISTANT", generated.message(), generated.source(), retrieval.sources());
        messageRepository.saveAll(List.of(userRow, assistantRow));
        String answer = generated.message();
        if (proposal != null) answer += "\n\nĐã tạo bản xem trước thay đổi lịch. Hãy xem và xác nhận trước khi áp dụng.";
        else if (requestedReschedule) answer += "\n\nChưa tạo được bản xem trước; lịch của bạn chưa thay đổi. Hãy mở mục Điều chỉnh lịch để xem lý do và thử lại.";
        return new CoachChatResponse(threadId, answer, generated.source(), generated.safetyEscalation(), retrieval.sources(), proposal, now,
                generated.references());
    }

    @Transactional(readOnly = true)
    public List<CoachChatMessageResponse> history(Long userId, String threadId) {
        String normalized = UUID.fromString(threadId).toString();
        return messageRepository.findTop100ByUserIdAndThreadIdOrderByCreatedAtAsc(userId, normalized).stream()
                .map(row -> new CoachChatMessageResponse(row.getId(), row.getRole(), row.getMessage(), row.getResponseSource(), readSources(row.getSourcesJson()), row.getCreatedAt())).toList();
    }

    @Transactional(readOnly = true)
    public List<CoachChatThreadResponse> threads(Long userId) {
        Map<String, CoachChatThreadResponse> latest = new LinkedHashMap<>();
        messageRepository.findTop100ByUserIdOrderByCreatedAtDesc(userId).forEach(row -> latest.putIfAbsent(row.getThreadId(),
                new CoachChatThreadResponse(row.getThreadId(), safe(row.getMessage(), 160), row.getCreatedAt())));
        return List.copyOf(latest.values());
    }

    @Transactional
    public void deleteThread(Long userId, String threadId) {
        messageRepository.deleteByUserIdAndThreadId(userId, UUID.fromString(threadId).toString());
    }

    private Retrieval retrieve(Long userId, String question, boolean allowPersonalKnowledge) {
        String q = normalize(question);
        Set<String> terms = WORDS.matcher(q).results().map(match -> match.group()).collect(java.util.stream.Collectors.toSet());
        List<PersonalAssistantSource> sources = new ArrayList<>();
        List<String> context = new ArrayList<>();
        boolean asksSchedule = containsAny(q, "lich", "buoi", "tap", "gym", "chay", "miss", "ke hoach", "hom nay", "workout");
        boolean asksFood = containsAny(q, "mon an", "an uong", "dinh duong", "bua an", "food", "meal", "protein", "calo");
        boolean asksReview = containsAny(q, "danh gia", "vi sao", "ly do", "thay doi", "met", "nang", "review");
        if (asksSchedule) {
            RoadmapRecord active = roadmapRepository.findFirstByUserIdAndStatusOrderByCreatedAtDesc(userId, "ACTIVE").orElse(null);
            if (active != null) {
                context.add("Active plan owned by user: " + active.getTitle() + "; goal/overview: " + safe(active.getOverview(), 600));
                slotRepository.findAllByRoadmap_IdOrderByDayIndexAscStartTimeAsc(active.getId()).stream().limit(40).forEach(slot ->
                        context.add("Plan slot day " + slot.getDayIndex() + " " + slot.getSessionPeriod() + " " + slot.getStartTime() + "-" + slot.getEndTime()
                                + ", " + slot.getActivity() + ", status=" + slot.getStatus()));
                if (containsAny(q, "da tap", "hoan thanh", "bo lo", "buoi tap", "activity", "run", "gym")) {
                    activityRepository.findAllByRoadmapIdAndUserIdOrderByStartedAtDesc(active.getId(), userId).stream().limit(8)
                            .forEach(item -> context.add("Recorded activity: " + item.getActivityType() + "; status=" + item.getStatus()
                                    + "; seconds=" + item.getDurationSeconds() + "; started=" + item.getStartedAt()));
                }
            } else context.add("No active workout plan is recorded for this account.");
        }
        if (asksFood) {
            LocalDate today = LocalDate.now(ZONE);
            mealRepository.findAllForUserAndDate(userId, today, today.atStartOfDay(), today.plusDays(1).atStartOfDay()).stream().limit(12)
                    .forEach(meal -> context.add("Recorded meal for " + today + ": " + safe(meal.getDishName(), 180) + "; status=" + meal.getStatus()
                            + "; planned=" + safe(meal.getPlannedMeal(), 180) + "; notes=" + safe(meal.getNotes(), 250)));
        }
        if (asksReview) reviewRepository.findTop30ByUserIdOrderByReviewDateDescCreatedAtDesc(userId).stream().limit(3)
                .forEach(review -> context.add("Daily review " + review.getReviewDate() + ": " + safe(review.getReviewJson(), 1200)));

        if (containsAny(q, "profile", "muc tieu", "gioi han", "the trang", "an uong", "schedule", "lich")) {
            profileRepository.findByUserId(userId).filter(UserProfile::isConsent).ifPresent(item -> context.add("Consented profile: goal="
                    + safe(item.getGoal(), 180) + "; activityLevel=" + safe(item.getActivityLevel(), 80) + "; restrictions=" + safe(item.getRestrictions(), 250)));
        }
        List<Long> completedDocumentIds = List.of();
        if (allowPersonalKnowledge && accessService.hasFeature(userId, PERSONAL_PREMIUM)) {
            PersonalAssistantProfile personalProfile = personalProfileRepository.findByUserId(userId).filter(PersonalAssistantProfile::isEnabled).orElse(null);
            if (personalProfile != null) context.add("Personal fitness goal=" + safe(personalProfile.getFitnessGoal(), 250) + "; limits=" + safe(personalProfile.getHealthLimits(), 350)
                    + "; personal guidance=" + safe(personalProfile.getAdditionalGuidance(), 500));
            completedDocumentIds = personalDocumentRepository.findTop100ByUserIdOrderByCreatedAtDesc(userId).stream()
                    .filter(doc -> "COMPLETED".equals(doc.getStatus())).map(PersonalKnowledgeDocument::getId).toList();
            if (!completedDocumentIds.isEmpty()) personalChunkRepository.findCompletedChunks(userId, completedDocumentIds, org.springframework.data.domain.PageRequest.of(0, 300)).stream()
                    .map(chunk -> new ScoredPersonal(chunk, score(chunk.getContent(), chunk.getDocument().getTitle(), terms)))
                    .filter(item -> item.score() > 0).sorted(Comparator.comparingLong(ScoredPersonal::score).reversed()).limit(4)
                    .forEach(item -> { sources.add(new PersonalAssistantSource(item.chunk().getDocument().getId(), item.chunk().getDocument().getTitle(),
                            "PERSONAL_DOCUMENT", null, item.chunk().getChunkIndex(), excerpt(item.chunk().getContent())));
                        context.add("Personal source " + item.chunk().getDocument().getTitle() + ": " + excerpt(item.chunk().getContent())); });
        }
        if (asksFood || requestWantsKnowledge(question)) sharedChunkRepository.findAllApprovedChunks(org.springframework.data.domain.PageRequest.of(0, 300)).stream()
                .map(chunk -> new ScoredShared(chunk, score(chunk.getContent(), chunk.getDocument().getTitle(), terms)))
                .filter(item -> item.score() > 0).sorted(Comparator.comparingLong(ScoredShared::score).reversed()).limit(4)
                .forEach(item -> { sources.add(new PersonalAssistantSource(item.chunk().getDocument().getId(), item.chunk().getDocument().getTitle(),
                        "SHARED_KNOWLEDGE_BASE", item.chunk().getDocument().getSourceUrl(), item.chunk().getChunkIndex(), excerpt(item.chunk().getContent())));
                    context.add("Shared KB source " + item.chunk().getDocument().getTitle() + ": " + excerpt(item.chunk().getContent())); });
        return new Retrieval(context, sources);
    }

    private String buildContext(Long userId, String question, Retrieval retrieval, List<CoachChatMessage> history) {
        List<String> lines = new ArrayList<>(retrieval.lines());
        history.stream().skip(Math.max(0, history.size() - 8)).forEach(item -> lines.add(item.getRole() + ": " + safe(item.getMessage(), 500)));
        if (lines.isEmpty()) lines.add("No related personal records or approved knowledge documents were found.");
        return String.join("\n", lines);
    }

    private boolean requestsReschedule(String q) {
        String n = normalize(q);
        return containsAny(n, "doi lich", "chuyen sang", "thay lich", "doi gym thanh", "doi thanh chay", "reschedule", "move my workout");
    }
    private boolean requestWantsPersonal(String q) { return containsAny(normalize(q), "tai lieu cua toi", "knowledge base ca nhan", "theo huong dan cua toi", "tai lieu rieng"); }
    private boolean requestWantsKnowledge(String q) { return containsAny(normalize(q), "nguon", "knowledge", "tai lieu", "theo tai lieu"); }
    private boolean containsAny(String text, String... words) { return Arrays.stream(words).anyMatch(text::contains); }
    private String normalize(String value) { return Normalizer.normalize(value.toLowerCase(Locale.ROOT), Normalizer.Form.NFD).replaceAll("\\p{M}+", "").replace('đ', 'd'); }
    private long score(String body, String title, Set<String> terms) { String content = normalize(body), heading = normalize(title); return terms.stream().mapToLong(term -> (heading.contains(term) ? 4 : 0) + (content.contains(term) ? 1 : 0)).sum(); }
    private String excerpt(String text) { return safe(text, 1600); }
    private String safe(String value, int max) { return value == null ? "" : value.substring(0, Math.min(max, value.length())); }
    private CoachChatMessage message(Long userId, String threadId, String role, String body, String source, List<PersonalAssistantSource> sources) {
        CoachChatMessage row = new CoachChatMessage(); row.setUserId(userId); row.setThreadId(threadId); row.setRole(role); row.setMessage(body); row.setResponseSource(source);
        try { row.setSourcesJson(objectMapper.writeValueAsString(sources)); } catch (JsonProcessingException ignored) { row.setSourcesJson("[]"); }
        return row;
    }
    private List<PersonalAssistantSource> readSources(String json) { try { return objectMapper.readValue(json == null ? "[]" : json, new TypeReference<>() {}); } catch (JsonProcessingException ignored) { return List.of(); } }
    private String threadId(String value) { return value == null || value.isBlank() ? UUID.randomUUID().toString() : UUID.fromString(value).toString(); }
    private void enforceRateLimit(Long userId) {
        long now = System.currentTimeMillis();
        Deque<Long> calls = callsByUser.computeIfAbsent(userId, ignored -> new ArrayDeque<>());
        synchronized (calls) {
            while (!calls.isEmpty() && now - calls.peekFirst() >= 60_000) calls.removeFirst();
            if (calls.size() >= 20) throw new CoachChatRateLimitException("Bạn đã gửi nhiều câu hỏi trong thời gian ngắn. Hãy thử lại sau một phút.");
            calls.addLast(now);
        }
    }
    private record Retrieval(List<String> lines, List<PersonalAssistantSource> sources) {}
    private record ScoredPersonal(PersonalKnowledgeChunk chunk, long score) {}
    private record ScoredShared(KnowledgeChunk chunk, long score) {}
}
