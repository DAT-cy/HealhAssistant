package health_assistant.module.doctor.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "doctor_reviews", indexes = @Index(name = "idx_doctor_reviews_request", columnList = "request_id,created_at"))
@Getter @Setter @NoArgsConstructor
public class DoctorReview {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "request_id", nullable = false) private Long requestId;
    @Column(name = "doctor_id", nullable = false) private Long doctorId;
    @Column(nullable = false, length = 30) private String action;
    @Column(columnDefinition = "TEXT") private String note;
    @Column(name = "roadmap_version", length = 80) private String roadmapVersion;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    public DoctorReview(Long requestId, Long doctorId, String action, String note, String roadmapVersion) { this.requestId=requestId; this.doctorId=doctorId; this.action=action; this.note=note; this.roadmapVersion=roadmapVersion; }
}
