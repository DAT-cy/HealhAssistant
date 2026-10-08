package health_assistant.module.profile.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.profile.dto.ProfileRequest;
import health_assistant.module.profile.dto.ProfileResponse;
import health_assistant.module.profile.service.ProfileService;
import health_assistant.utils.ClientUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ClientUtils.VERSION + "/profiles")
@RequiredArgsConstructor
public class ProfileController {
    private final ProfileService profileService;

    @PostMapping
    public ResponseEntity<DefaultRes<ProfileResponse>> save(@Valid @RequestBody ProfileRequest request) {
        return ResponseEntity.status(StatusCode.CREATED).body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED, profileService.save(request)));
    }

    @GetMapping("/me")
    public ResponseEntity<DefaultRes<ProfileResponse>> getMine() {
        ProfileResponse profile = profileService.getMine();
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, profile));
    }
}
