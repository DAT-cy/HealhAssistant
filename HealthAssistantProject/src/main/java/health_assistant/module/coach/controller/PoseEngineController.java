package health_assistant.module.coach.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.coach.dto.AngleRequest;
import health_assistant.module.posture.dto.Point3D;
import health_assistant.utils.ClientUtils;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ClientUtils.VERSION + "/pose-engine")
public class PoseEngineController {
    @PostMapping("/angle")
    public ResponseEntity<DefaultRes<Double>> angle(@Valid @RequestBody AngleRequest request) {
        Point3D a = request.first();
        Point3D b = request.vertex();
        Point3D c = request.last();
        double[] ba = {a.x() - b.x(), a.y() - b.y(), a.z() - b.z()};
        double[] bc = {c.x() - b.x(), c.y() - b.y(), c.z() - b.z()};
        double denominator = norm(ba) * norm(bc);
        double angle = denominator == 0 ? 0 : Math.toDegrees(Math.acos(clamp(dot(ba, bc) / denominator)));
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, angle));
    }

    private double dot(double[] a, double[] b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    private double norm(double[] value) { return Math.sqrt(dot(value, value)); }
    private double clamp(double value) { return Math.max(-1, Math.min(1, value)); }
}
