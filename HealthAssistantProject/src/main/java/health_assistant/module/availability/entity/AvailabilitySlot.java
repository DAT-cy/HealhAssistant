package health_assistant.module.availability.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalTime;

@Entity
@Table(name = "availability_slots", indexes =
        @Index(name = "idx_availability_user_day", columnList = "user_id,day_of_week,is_active"))
@Getter
@Setter
public class AvailabilitySlot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "day_of_week", nullable = false)
    private int dayOfWeek;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "activity_type", nullable = false, length = 30)
    private String activityType;

    @Column(name = "location_type", nullable = false, length = 30)
    private String locationType;

    @Column(name = "equipment_notes", length = 500)
    private String equipmentNotes;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
