package health_assistant.module.doctor.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "doctor_profiles", uniqueConstraints = @UniqueConstraint(name = "uk_doctor_profile_user", columnNames = "user_id"))
@Getter @Setter @NoArgsConstructor
public class DoctorProfile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(nullable = false, length = 120) private String fullName;
    @Column(nullable = false, length = 160) private String specialty;
    @Column(columnDefinition = "TEXT") private String degrees;
    @Column(name = "years_experience", nullable = false) private int yearsExperience;
    @Column(columnDefinition = "TEXT") private String bio;
    @Column(nullable = false) private boolean active = true;
    @Column(name = "last_seen_at") private Instant lastSeenAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();
    public boolean isOnline() { return active && lastSeenAt != null && lastSeenAt.isAfter(Instant.now().minusSeconds(300)); }
}
