package health_assistant.module.doctor.controller;

import health_assistant.config.response.*;
import health_assistant.module.doctor.dto.DiseaseResponse;
import health_assistant.module.doctor.service.DiseaseRiskAssessmentService;
import health_assistant.utils.ClientUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(ClientUtils.VERSION + "/health/diseases")
@RequiredArgsConstructor
public class DiseaseCatalogController {
    private final DiseaseRiskAssessmentService riskService;

    @GetMapping
    public ResponseEntity<DefaultRes<List<DiseaseResponse>>> list(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST, riskService.diseases(q, null, null)));
    }
}
