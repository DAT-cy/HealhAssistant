package health_assistant.module.posture.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "posture_reports")
@Getter
@Setter
public class PostureReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false)
    private Long userId;
    @Column(nullable = false, length = 10)
    private String view;
    @Column(nullable = false)
    private boolean reliable;
    private double shoulderImbalanceDegrees;
    private double pelvicTiltDegrees;
    private double forwardHeadDegrees;
    @Column(length = 4000)
    private String findings;
    @Column(length = 4000)
    private String recommendations;
    @Column(nullable = false)
    private Instant createdAt;
}
