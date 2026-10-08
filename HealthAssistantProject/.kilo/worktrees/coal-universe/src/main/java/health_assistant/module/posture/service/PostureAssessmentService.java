package health_assistant.module.posture.service;

import health_assistant.module.posture.dto.Point3D;
import health_assistant.module.posture.dto.PostureAssessmentRequest;
import health_assistant.module.posture.dto.PostureAssessmentResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class PostureAssessmentService {
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
            findings.add("Landmark visibility is below 0.5; repeat the scan with the full body visible.");
        }
        if (shoulder >= SHOULDER_THRESHOLD) {
            findings.add("Shoulder imbalance detected.");
            recommendations.add("Add scapular control and upper-back mobility exercises.");
        }
        if (pelvis >= PELVIS_THRESHOLD) {
            findings.add("Pelvic tilt detected.");
            recommendations.add("Train glute and core control with a neutral pelvis.");
        }
        if (forwardHead >= FORWARD_HEAD_THRESHOLD) {
            findings.add("Forward head posture detected.");
            recommendations.add("Practice chin tucks and thoracic extension drills.");
        }
        if (findings.isEmpty()) {
            findings.add("No material deviation detected by the configured thresholds.");
        }
        return new PostureAssessmentResponse(request.view(), reliable, shoulder, pelvis, forwardHead,
                findings, recommendations);
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
