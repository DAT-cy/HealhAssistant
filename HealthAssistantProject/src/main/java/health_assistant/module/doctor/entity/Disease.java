package health_assistant.module.doctor.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "doctor_diseases", indexes = {
        @Index(name = "idx_disease_active_specialty", columnList = "active,specialty"),
        @Index(name = "idx_disease_code", columnList = "code")
})
@Getter @Setter @NoArgsConstructor
public class Disease {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 40, unique = true) private String code;
    @Column(nullable = false, length = 160) private String name;
    @Column(length = 120) private String specialty;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(columnDefinition = "TEXT") private String symptoms;
    @Column(columnDefinition = "TEXT") private String causes;
    @Column(name = "risk_factors", columnDefinition = "TEXT") private String riskFactors;
    @Column(name = "care_guidance", columnDefinition = "TEXT") private String careGuidance;
    @Column(name = "reference_source", length = 1000) private String referenceSource;
    @Column(nullable = false, length = 12) private String severity = "LOW";
    @Column(name = "doctor_required", nullable = false) private boolean doctorRequired;
    @Column(name = "roadmap_confirmation_required", nullable = false) private boolean roadmapConfirmationRequired;
    @Column(name = "ai_allowed", nullable = false) private boolean aiAllowed = true;
    @Column(nullable = false) private int priority = 50;
    @Column(name = "special_instructions", columnDefinition = "TEXT") private String specialInstructions;
    @Column(nullable = false) private boolean active = true;
    @Column(name = "updated_by", nullable = false) private Long updatedBy;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();
}
