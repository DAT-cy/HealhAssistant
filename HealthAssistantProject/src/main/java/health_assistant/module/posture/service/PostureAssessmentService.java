package health_assistant.module.posture.service;

import health_assistant.module.posture.dto.Point3D;
import health_assistant.module.posture.dto.PostureAssessmentRequest;
import health_assistant.module.posture.dto.PostureAssessmentResponse;
import org.springframework.stereotype.Service;
import health_assistant.module.posture.entity.PostureReport;
import health_assistant.module.posture.repository.PostureReportRepository;
import health_assistant.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PostureAssessmentService {
    private final PostureReportRepository reportRepository;
    private final ObjectMapper objectMapper;
    private static final double MIN_VISIBILITY = 0.5;
    private static final double SHOULDER_THRESHOLD = 3.0;
    private static final double PELVIS_THRESHOLD = 3.0;
    private static final double FORWARD_HEAD_THRESHOLD = 10.0;

    public PostureAssessmentResponse assess(PostureAssessmentRequest request) {
        List<Point3D> points = List.of(request.leftShoulder(), request.rightShoulder(),
                request.leftHip(), request.rightHip(), request.leftEar(), request.rightEar(), request.neck());
        boolean reliable = points.stream().allMatch(point -> point.isVisible(MIN_VISIBILITY));

        double shoulder = angleOfLine(request.leftShoulder(), request.rightShoulder());
        double pelvis = angleOfLine(request.leftHip(), request.rightHip());
        double forwardHead = forwardHeadAngle(request);
        List<String> findings = new ArrayList<>();
        List<String> recommendations = new ArrayList<>();
        if (!reliable) {
            findings.add("Chưa nhận đủ điểm mốc. Hãy lùi xa và chỉnh camera để thấy toàn bộ cơ thể.");
        }
        if (shoulder >= SHOULDER_THRESHOLD) {
            findings.add("Phát hiện chênh lệch hai vai.");
            recommendations.add("Tập kiểm soát bả vai và tăng độ linh hoạt lưng trên.");
        }
        if (pelvis >= PELVIS_THRESHOLD) {
            findings.add("Phát hiện độ nghiêng khung chậu.");
            recommendations.add("Tập kiểm soát cơ mông và cơ trung tâm với khung chậu trung lập.");
        }
        if (forwardHead >= FORWARD_HEAD_THRESHOLD) {
            findings.add("Phát hiện đầu đưa về phía trước.");
            recommendations.add("Tập thu cằm và mở rộng vùng lưng ngực.");
        }
        if (findings.isEmpty()) {
            findings.add("Chưa phát hiện sai lệch đáng kể theo ngưỡng hiện tại.");
        }
        PostureAssessmentResponse response = new PostureAssessmentResponse(request.view(), reliable, shoulder, pelvis, forwardHead,
                findings, recommendations);
        if (SecurityUtils.getCurrentUser() != null) {
            PostureReport report = new PostureReport();
            report.setUserId(SecurityUtils.getCurrentUserId());
            report.setView(request.view());
            report.setReliable(reliable);
            report.setShoulderImbalanceDegrees(shoulder);
            report.setPelvicTiltDegrees(pelvis);
            report.setForwardHeadDegrees(forwardHead);
            report.setFindings(writeJson(findings));
            report.setRecommendations(writeJson(recommendations));
            report.setCreatedAt(java.time.Instant.now());
            reportRepository.save(report);
        }
        return response;
    }

    private String writeJson(List<String> values) {
        try { return objectMapper.writeValueAsString(values); }
        catch (JsonProcessingException exception) { return "[]"; }
    }

    private double angleOfLine(Point3D first, Point3D second) {
        return Math.toDegrees(Math.atan2(Math.abs(second.y() - first.y()),
                Math.abs(second.x() - first.x())));
    }

    private double forwardHeadAngle(PostureAssessmentRequest request) {
        Point3D ear = new Point3D((request.leftEar().x() + request.rightEar().x()) / 2,
                (request.leftEar().y() + request.rightEar().y()) / 2,
                (request.leftEar().z() + request.rightEar().z()) / 2, 1);
        Point3D shoulder = new Point3D((request.leftShoulder().x() + request.rightShoulder().x()) / 2,
                (request.leftShoulder().y() + request.rightShoulder().y()) / 2,
                (request.leftShoulder().z() + request.rightShoulder().z()) / 2, 1);
        double horizontal = Math.hypot(ear.x() - shoulder.x(), ear.z() - shoulder.z());
        return Math.toDegrees(Math.atan2(horizontal, Math.abs(ear.y() - shoulder.y())));
    }
}
