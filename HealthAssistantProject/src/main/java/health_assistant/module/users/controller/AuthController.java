package health_assistant.module.users.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.users.dto.request.LoginRequest;
import health_assistant.module.users.dto.request.SignUpRequest;
import health_assistant.module.users.dto.response.LoginResponse;
import health_assistant.module.users.dto.response.ProfileUser;
import health_assistant.module.users.service.UserService;
import health_assistant.utils.ClientUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ClientUtils.VERSION + "/auth")
@Tag(name = "01. Authentication", description = "Authentication APIs")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/login")
    @Operation(summary = "Login to get JWT token")
    public ResponseEntity<DefaultRes<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        return new ResponseEntity<>(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, userService.login(request)), HttpStatus.OK);

    }
    @PostMapping("/signup")
    public ResponseEntity<DefaultRes<Boolean>> signUp(@Valid @RequestBody SignUpRequest signUpRequest) {
        return new ResponseEntity<>(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, userService.signUp(signUpRequest)), HttpStatus.OK);
    }

    @GetMapping("/profile")
    public ResponseEntity<DefaultRes<ProfileUser>> getProfile() {
        return new ResponseEntity<>(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, userService.getProfile()), HttpStatus.OK);
    }
} 