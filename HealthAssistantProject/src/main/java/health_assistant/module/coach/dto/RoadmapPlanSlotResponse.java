package health_assistant.module.coach.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

public record RoadmapPlanSlotResponse(Long id, int dayIndex, LocalDate date, String sessionPeriod,
                                      @JsonFormat(pattern = "HH:mm") LocalTime startTime,
                                      @JsonFormat(pattern = "HH:mm") LocalTime endTime, int durationMinutes,
                                      String activityType, String activity, String status, Instant startedAt,
                                      Instant completedAt, Integer actualDurationMinutes, String notes,
                                      String skipReason) {}
