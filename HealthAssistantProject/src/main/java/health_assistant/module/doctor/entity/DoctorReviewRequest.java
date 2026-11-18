package health_assistant.module.doctor.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "doctor_review_requests", indexes = {
        @Index(name = "idx_doctor_review_status_priority", columnList = "status,priority,created_at"),
        @Index(name = "idx_doctor_review_assignee", columnList = "assigned_doctor_id,status")
})
@Getter @Setter @NoArgsConstructor
public class DoctorReviewRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(name = "roadmap_id") private Long roadmapId;
    @Column(name = "assigned_doctor_id") private Long assignedDoctorId;
    @Column(nullable = false, length = 30) private String decision;
    @Column(nullable = false, length = 20) private String status = "PENDING_ASSIGNMENT";
    @Column(nullable = false, length = 20) private String priority = "NORMAL";
    @Column(nullable = false, length = 2000) private String reason;
    @Column(name = "disease_codes", columnDefinition = "TEXT") private String diseaseCodes;
    @Column(name = "risk_summary", columnDefinition = "TEXT") private String riskSummary;
    @Column(name = "full_text", columnDefinition = "LONGTEXT") private String fullText;
    @Column(name = "policy_version", length = 80) private String policyVersion;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    @Column(name = "assigned_at") private Instant assignedAt;
    @Column(name = "completed_at") private Instant completedAt;
    /** 3 phương án AI đề xuất (JSON List<GeminiRoadmapResponse>) để bác sĩ duyệt. */
    @Column(name = "ai_plan_json", columnDefinition = "LONGTEXT") private String aiPlanJson;
    /** Lịch tập người dùng chọn lúc gửi yêu cầu (JSON). */
    @Column(name = "schedule_json", columnDefinition = "LONGTEXT") private String scheduleJson;
    /** Yêu cầu trước đó bị bác sĩ "yêu cầu sửa" mà yêu cầu này thay thế. */
    @Column(name = "previous_request_id") private Long previousRequestId;
    /** Thông tin người dùng bổ sung khi bác sĩ cần thêm thông tin. */
    @Column(name = "user_reply", columnDefinition = "TEXT") private String userReply;
    /** Thời điểm phương án đã duyệt được kích hoạt thành lộ trình. */
    @Column(name = "applied_at") private Instant appliedAt;
    @Version private Long rowVersion;
}
