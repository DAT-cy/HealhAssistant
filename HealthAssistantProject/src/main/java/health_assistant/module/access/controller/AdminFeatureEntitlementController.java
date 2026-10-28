package health_assistant.module.access.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.access.dto.FeatureEntitlementResponse;
import health_assistant.module.access.dto.GrantFeatureEntitlementRequest;
import health_assistant.module.access.service.FeatureEntitlementAdminService;
import health_assistant.utils.ClientUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ClientUtils.VERSION + "/admin/feature-entitlements")
@RequiredArgsConstructor
public class AdminFeatureEntitlementController {
    private final FeatureEntitlementAdminService service;

    @PostMapping
    public ResponseEntity<DefaultRes<FeatureEntitlementResponse>> grant(@Valid @RequestBody GrantFeatureEntitlementRequest request) {
        return ResponseEntity.status(StatusCode.CREATED).body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED, service.grant(request)));
    }

    @PostMapping("/{id}/revoke")
    public ResponseEntity<DefaultRes<FeatureEntitlementResponse>> revoke(@PathVariable Long id) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, service.revoke(id)));
    }
}
