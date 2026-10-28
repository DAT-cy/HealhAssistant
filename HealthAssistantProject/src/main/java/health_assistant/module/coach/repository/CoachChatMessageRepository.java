package health_assistant.module.coach.repository;

import health_assistant.module.coach.entity.CoachChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CoachChatMessageRepository extends JpaRepository<CoachChatMessage, Long> {
    List<CoachChatMessage> findTop100ByUserIdAndThreadIdOrderByCreatedAtAsc(Long userId, String threadId);
    List<CoachChatMessage> findTop100ByUserIdOrderByCreatedAtDesc(Long userId);
    long deleteByUserIdAndThreadId(Long userId, String threadId);
}
