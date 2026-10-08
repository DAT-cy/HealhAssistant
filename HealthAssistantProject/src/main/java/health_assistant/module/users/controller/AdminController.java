package health_assistant.module.users.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.utils.ClientUtils;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ClientUtils.VERSION + "/admin/users")
@Tag(name = "03. Users management")
@RequiredArgsConstructor
public class AdminController {

    @GetMapping
    public ResponseEntity<DefaultRes<String>> test() {
        return new ResponseEntity<>(DefaultRes.res(StatusCode.OK, ResponseMessage.SUCCESS, "Test"), HttpStatus.OK);

    }
}
