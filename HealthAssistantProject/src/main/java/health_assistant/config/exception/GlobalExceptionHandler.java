package health_assistant.config.exception;

import health_assistant.config.response.CommonException;
import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ErrorCode;
import health_assistant.module.coach.service.CoachChatRateLimitException;
import health_assistant.module.users.service.OtpEmailDeliveryException;
import health_assistant.module.users.service.OtpRateLimitException;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MissingServletRequestParameterException;

import java.security.SignatureException;
import java.util.HashMap;
import java.util.Map;


@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<DefaultRes<Map<String, String>>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors()
                .forEach(c -> errors.put(((FieldError) c).getField(), c.getDefaultMessage()));
        return ResponseEntity.badRequest().body(DefaultRes.<Map<String, String>>builder()
                .statusCode(ErrorCode.BAD_REQUEST.getStatus())
                .responseCode(ErrorCode.BAD_REQUEST.getErrorCode())
                .responseMessage("Dữ liệu không hợp lệ")
                .data(errors).build());
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<DefaultRes<Map<String, String>>> handleInvalidRequestParameter(Exception ex) {
        Map<String, String> errors = new HashMap<>();
        errors.put("message", "Tham số yêu cầu bị thiếu hoặc không đúng định dạng.");
        return ResponseEntity.badRequest().body(DefaultRes.<Map<String, String>>builder()
                .statusCode(ErrorCode.BAD_REQUEST.getStatus())
                .responseCode(ErrorCode.BAD_REQUEST.getErrorCode())
                .responseMessage("Tham số yêu cầu bị thiếu hoặc không đúng định dạng.")
                .data(errors).build());
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<DefaultRes<Map<String, String>>> handleFeatureAccessDenied(AccessDeniedException ex) {
        Map<String, String> errors = new HashMap<>();
        errors.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(DefaultRes.<Map<String, String>>builder()
                .statusCode(ErrorCode.FORBIDDEN_ERROR.getStatus())
                .responseCode(ErrorCode.FORBIDDEN_ERROR.getErrorCode())
                .responseMessage(ex.getMessage())
                .data(errors).build());
    }

    @ExceptionHandler(CoachChatRateLimitException.class)
    public ResponseEntity<DefaultRes<Map<String, String>>> handleCoachChatRateLimit(CoachChatRateLimitException ex) {
        Map<String, String> errors = new HashMap<>();
        errors.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(DefaultRes.<Map<String, String>>builder()
                .statusCode(HttpStatus.TOO_MANY_REQUESTS.value()).responseMessage(ex.getMessage()).data(errors).build());
    }

    @ExceptionHandler(OtpRateLimitException.class)
    public ResponseEntity<DefaultRes<Map<String, String>>> handleOtpRateLimit(OtpRateLimitException ex) {
        Map<String, String> errors = new HashMap<>(); errors.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(DefaultRes.<Map<String, String>>builder()
                .statusCode(HttpStatus.TOO_MANY_REQUESTS.value()).responseMessage(ex.getMessage()).data(errors).build());
    }

    @ExceptionHandler(OtpEmailDeliveryException.class)
    public ResponseEntity<DefaultRes<Map<String, String>>> handleOtpMailFailure(OtpEmailDeliveryException ex) {
        Map<String, String> errors = new HashMap<>(); errors.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(DefaultRes.<Map<String, String>>builder()
                .statusCode(HttpStatus.SERVICE_UNAVAILABLE.value()).responseMessage(ex.getMessage()).data(errors).build());
    }

    @ExceptionHandler(value = {IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<DefaultRes<Map<String, String>>> handleConflict(RuntimeException ex, WebRequest request) {
        Map<String, String> errors = new HashMap<>();
        errors.put("message", ex.getMessage());
        return ResponseEntity.badRequest().body(DefaultRes.<Map<String, String>>builder()
                .statusCode(ErrorCode.BAD_REQUEST.getStatus())
                .responseCode(ErrorCode.BAD_REQUEST.getErrorCode())
                .responseMessage(ex.getMessage() == null ? "Dữ liệu không hợp lệ" : ex.getMessage())
                .data(errors).build());
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<DefaultRes<Object>> handleEntityNotFoundException(EntityNotFoundException ex) {
        DefaultRes<Object> response = new DefaultRes<>(ErrorCode.ENTITY_NOT_FOUND.getStatus(), ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<DefaultRes<Object>> handleGlobalException(Exception ex) {
        DefaultRes<Object> response = new DefaultRes<>(ErrorCode.INTER_SERVER_ERROR.getStatus(), ex.getMessage());
        log.error(String.valueOf(ex.getCause()));
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(SignatureException.class)
    public ResponseEntity<DefaultRes<Object>> handleSignatureException(SignatureException ex) {
        DefaultRes<Object> response = new DefaultRes<>(ErrorCode.JWT_INVALID.getStatus(), ErrorCode.JWT_INVALID.getMessage());
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<DefaultRes<Object>> handleNoResourceFoundException(NoResourceFoundException ex) {
        DefaultRes<Object> response = new DefaultRes<>(ErrorCode.API_NOT_FOUND.getStatus(), ErrorCode.API_NOT_FOUND.getMessage());
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(CommonException.class)
    public ResponseEntity<DefaultRes<Object>> handleEmailDuplicateException(CommonException ex) {
        DefaultRes<Object> response = new DefaultRes<>(ex.getErrorCode());
        log.error(String.valueOf(ex.getCause()));
        return new ResponseEntity<>(response, HttpStatus.valueOf(ex.getErrorCode().getStatus()));
    }

}
