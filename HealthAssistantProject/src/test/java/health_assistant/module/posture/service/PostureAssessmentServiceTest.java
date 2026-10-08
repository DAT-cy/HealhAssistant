package health_assistant.module.posture.service;

import health_assistant.module.posture.dto.Point3D;
import health_assistant.module.posture.dto.PostureAssessmentRequest;
import health_assistant.module.posture.dto.PostureAssessmentResponse;
import org.junit.jupiter.api.Test;
import com.fasterxml.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

class PostureAssessmentServiceTest {

    private final PostureAssessmentService service = new PostureAssessmentService(null, new ObjectMapper());

    @Test
    void marksUnreliableWhenAnyLandmarkHasLowVisibility() {
        PostureAssessmentResponse response = service.assess(request(0.3));
        assertThat(response.reliable()).isFalse();
        assertThat(response.findings()).anyMatch(finding -> finding.contains("điểm mốc"));
    }

    @Test
    void reliableWhenAllLandmarksAreVisible() {
        PostureAssessmentResponse response = service.assess(request(0.9));
        assertThat(response.reliable()).isTrue();
    }

    private PostureAssessmentRequest request(double visibility) {
        Point3D left = new Point3D(-0.2, 0, 0, visibility);
        Point3D right = new Point3D(0.2, 0, 0, visibility);
        Point3D leftHip = new Point3D(-0.18, -0.5, 0, visibility);
        Point3D rightHip = new Point3D(0.18, -0.5, 0, visibility);
        Point3D leftEar = new Point3D(-0.08, 0.45, 0, visibility);
        Point3D rightEar = new Point3D(0.08, 0.45, 0, visibility);
        Point3D neck = new Point3D(0, 0.3, 0, visibility);
        return new PostureAssessmentRequest(left, right, leftHip, rightHip, leftEar, rightEar, neck, "FRONT");
    }
}
