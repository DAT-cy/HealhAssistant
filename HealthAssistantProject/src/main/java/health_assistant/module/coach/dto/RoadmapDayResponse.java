package health_assistant.module.coach.dto;

import java.time.LocalDate;
import java.util.List;

public record RoadmapDayResponse(Long roadmapId, String roadmapTitle, int dayIndex, LocalDate date,
                                 String status, int totalSlots, int completedSlots, int expectedMinutes,
                                 int actualMinutes, String weeklyFocus, List<String> safetyNotes,
                                 List<RoadmapPlanSlotResponse> slots) {}
