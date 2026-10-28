package health_assistant.module.coach.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "coach_chat_messages", indexes = @Index(name = "idx_coach_chat_user_thread", columnList = "user_id,thread_id,created_at"))
@Getter
@Setter
public class CoachChatMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(name = "thread_id", nullable = false, length = 36)
    private String threadId;
    @Column(nullable = false, length = 12)
    private String role;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;
    @Column(name = "response_source", length = 30)
    private String responseSource;
    @Column(name = "sources_json", columnDefinition = "TEXT")
    private String sourcesJson;
    @Column(nullable = false)
    private Instant createdAt;
    @PrePersist void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
