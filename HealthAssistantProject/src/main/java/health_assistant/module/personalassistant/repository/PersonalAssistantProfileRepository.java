package health_assistant.module.personalassistant.repository;

import health_assistant.module.personalassistant.entity.PersonalAssistantProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PersonalAssistantProfileRepository extends JpaRepository<PersonalAssistantProfile, Long> {
    Optional<PersonalAssistantProfile> findByUserId(Long userId);
}
