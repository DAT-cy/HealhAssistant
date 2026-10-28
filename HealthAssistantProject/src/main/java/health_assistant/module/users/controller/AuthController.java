package health_assistant.module.users.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.users.dto.request.LoginRequest;
import health_assistant.module.users.dto.request.GoogleLoginRequest;
import health_assistant.module.users.dto.request.SignUpRequest;
import health_assistant.module.users.dto.request.ForgotPasswordRequest;
import health_assistant.module.users.dto.request.OtpVerifyRequest;
import health_assistant.module.users.dto.request.ResendOtpRequest;
import health_assistant.module.users.dto.request.ResetPasswordRequest;
import health_assistant.module.users.dto.response.LoginResponse;
import health_assistant.module.users.dto.response.OtpChallengeResponse;
import health_assistant.module.users.dto.response.OtpVerificationResponse;
import health_assistant.module.users.dto.response.ProfileUser;
import health_assistant.module.users.service.UserService;
import health_assistant.module.users.service.GoogleAuthService;
import health_assistant.module.users.service.OtpService;
import health_assistant.utils.ClientUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
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
    private final GoogleAuthService googleAuthService;
    private final OtpService otpService;

    @PostMapping("/login")
    @Operation(summary = "Login to get JWT token")
    public ResponseEntity<DefaultRes<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        return new ResponseEntity<>(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, userService.login(request)), HttpStatus.OK);

    }

    @PostMapping("/google")
    @Operation(summary = "Verify Google ID token and issue the app JWT")
    public ResponseEntity<DefaultRes<LoginResponse>> googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, googleAuthService.login(request)));
    }
    @PostMapping("/signup")
    public ResponseEntity<DefaultRes<OtpChallengeResponse>> signUp(@Valid @RequestBody SignUpRequest signUpRequest,
                                                                   HttpServletRequest servletRequest) {
        return ResponseEntity.accepted().body(DefaultRes.res(HttpStatus.ACCEPTED.value(), ResponseMessage.SUCCESS,
                otpService.beginRegistration(signUpRequest, servletRequest.getRemoteAddr())));
    }

    @PostMapping("/otp/verify")
    public ResponseEntity<DefaultRes<OtpVerificationResponse>> verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        OtpVerificationResponse response = otpService.verify(request);
        if (!response.verified()) return ResponseEntity.badRequest().body(DefaultRes.res(StatusCode.BAD_REQUEST, response.message(), response));
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, response));
    }

    @PostMapping("/otp/resend")
    public ResponseEntity<DefaultRes<OtpChallengeResponse>> resendOtp(@Valid @RequestBody ResendOtpRequest request,
                                                                      HttpServletRequest servletRequest) {
        return ResponseEntity.accepted().body(DefaultRes.res(HttpStatus.ACCEPTED.value(), ResponseMessage.SUCCESS,
                otpService.resend(request, servletRequest.getRemoteAddr())));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<DefaultRes<OtpChallengeResponse>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request,
                                                                           HttpServletRequest servletRequest) {
        return ResponseEntity.accepted().body(DefaultRes.res(HttpStatus.ACCEPTED.value(), ResponseMessage.SUCCESS,
                otpService.beginPasswordReset(request, servletRequest.getRemoteAddr())));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<DefaultRes<Boolean>> resetPassword(@Valid @RequestBody ResetPasswordRequest request,
                                                             HttpServletRequest servletRequest) {
        otpService.resetPassword(request, servletRequest.getRemoteAddr());
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, true));
    }

    @GetMapping("/profile")
    public ResponseEntity<DefaultRes<ProfileUser>> getProfile() {
        return new ResponseEntity<>(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, userService.getProfile()), HttpStatus.OK);
    }
}
