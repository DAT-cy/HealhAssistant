package health_assistant.module.personalassistant.repository;

import health_assistant.module.personalassistant.entity.PersonalAssistantMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PersonalAssistantMessageRepository extends JpaRepository<PersonalAssistantMessage, Long> {
    List<PersonalAssistantMessage> findTop100ByUserIdAndThreadIdOrderByCreatedAtAsc(Long userId, String threadId);
    List<PersonalAssistantMessage> findTop100ByUserIdOrderByCreatedAtDesc(Long userId);
    long deleteByUserIdAndThreadId(Long userId, String threadId);
}
