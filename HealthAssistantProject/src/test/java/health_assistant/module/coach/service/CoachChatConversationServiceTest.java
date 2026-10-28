package health_assistant.module.coach.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.access.service.FeatureAccessService;
import health_assistant.module.coach.repository.*;
import health_assistant.module.knowledge.repository.KnowledgeChunkRepository;
import health_assistant.module.nutrition.repository.MealLogRepository;
import health_assistant.module.personalassistant.repository.*;
import health_assistant.module.profile.repository.UserProfileRepository;
import health_assistant.module.workout.repository.ActivitySessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CoachChatConversationServiceTest {
    @Mock CoachChatService chatService;
    @Mock PlanRescheduleService rescheduleService;
    @Mock UserProfileRepository profileRepository;
    @Mock RoadmapRecordRepository roadmapRepository;
    @Mock RoadmapPlanSlotRepository slotRepository;
    @Mock ActivitySessionRepository activityRepository;
    @Mock MealLogRepository mealRepository;
    @Mock DailyAiReviewRepository reviewRepository;
    @Mock KnowledgeChunkRepository sharedChunkRepository;
    @Mock PersonalAssistantProfileRepository personalProfileRepository;
    @Mock PersonalKnowledgeDocumentRepository personalDocumentRepository;
    @Mock PersonalKnowledgeChunkRepository personalChunkRepository;
    @Mock CoachChatMessageRepository messageRepository;
    @Mock FeatureAccessService accessService;
    @Mock ObjectMapper objectMapper;
    @InjectMocks CoachChatConversationService service;

    @Test
    void historyIsAlwaysScopedByAuthenticatedOwnerAndThread() {
        service.history(52L, "7ba9d112-9b39-4f6e-a7f8-1c3bb2e2a802");
        verify(messageRepository).findTop100ByUserIdAndThreadIdOrderByCreatedAtAsc(52L, "7ba9d112-9b39-4f6e-a7f8-1c3bb2e2a802");
        verifyNoMoreInteractions(messageRepository);
    }

    @Test
    void deletesOnlyTheCurrentUsersConversationThread() {
        service.deleteThread(52L, "7ba9d112-9b39-4f6e-a7f8-1c3bb2e2a802");
        verify(messageRepository).deleteByUserIdAndThreadId(52L, "7ba9d112-9b39-4f6e-a7f8-1c3bb2e2a802");
        verifyNoMoreInteractions(messageRepository);
    }
}
