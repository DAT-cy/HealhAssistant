package health_assistant.module.access.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.access.dto.FeatureAccessResponse;
import health_assistant.module.access.service.FeatureAccessService;
import health_assistant.utils.ClientUtils;
import health_assistant.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ClientUtils.VERSION + "/features/access")
@RequiredArgsConstructor
public class FeatureAccessController {
    private final FeatureAccessService featureAccessService;

    @GetMapping
    public ResponseEntity<DefaultRes<FeatureAccessResponse>> access(@RequestParam String featureCode) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE,
                new FeatureAccessResponse(featureCode,
                        featureAccessService.hasFeature(SecurityUtils.getCurrentUserId(), featureCode))));
    }
}
