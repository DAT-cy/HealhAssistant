package health_assistant.module.users.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.users.dto.request.SignUpRequest;
import health_assistant.module.users.service.UserService;
import health_assistant.utils.ClientUtils;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(ClientUtils.VERSION + "/user/users")
@Tag(name = "02. Users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<DefaultRes<String>> test() {
        return new ResponseEntity<>(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, "Test"), HttpStatus.OK);

    }

}
