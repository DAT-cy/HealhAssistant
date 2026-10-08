package health_assistant.config.exception;

import health_assistant.config.response.CommonException;
import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ErrorCode;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.security.SignatureException;
import java.util.HashMap;
import java.util.Map;


@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors()
                .forEach(c -> errors.put(((FieldError) c).getField(), c.getDefaultMessage()));
        return ResponseEntity.badRequest().body(errors);
    }

    @ExceptionHandler(value = {IllegalArgumentException.class, IllegalStateException.class})
    public ResponseEntity<Map<String, String>> handleConflict(RuntimeException ex, WebRequest request) {
        Map<String, String> errors = new HashMap<>();
        errors.put("message", ex.getMessage());
        return ResponseEntity.badRequest().body(errors);
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