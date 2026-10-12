package health_assistant.module.profile.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.profile.dto.ProfileRequest;
import health_assistant.module.profile.dto.ProfileResponse;
import health_assistant.module.profile.service.ProfileService;
import health_assistant.module.media.service.CloudinaryUploadService;
import health_assistant.utils.ClientUtils;
import health_assistant.utils.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ClientUtils.VERSION + "/profiles")
@RequiredArgsConstructor
public class ProfileController {
    private final ProfileService profileService;
    private final CloudinaryUploadService cloudinaryUploadService;

    @PostMapping
    public ResponseEntity<DefaultRes<ProfileResponse>> save(@Valid @RequestBody ProfileRequest request) {
        return ResponseEntity.status(StatusCode.CREATED).body(DefaultRes.res(StatusCode.CREATED, ResponseMessage.CREATED, profileService.save(request)));
    }

    @GetMapping("/me")
    public ResponseEntity<DefaultRes<ProfileResponse>> getMine() {
        ProfileResponse profile = profileService.getMine();
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, profile));
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DefaultRes<ProfileResponse>> uploadAvatar(@RequestParam("file") MultipartFile file) {
        profileService.getMine();
        Long userId = SecurityUtils.getCurrentUserId();
        CloudinaryUploadService.UploadedAvatar uploaded = cloudinaryUploadService.uploadAvatar(userId, file);
        ProfileResponse profile = profileService.updateAvatar(uploaded.secureUrl(), uploaded.publicId());
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.CREATED, profile));
    }
}
