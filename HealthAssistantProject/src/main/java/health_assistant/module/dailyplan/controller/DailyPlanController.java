package health_assistant.module.dailyplan.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.dailyplan.dto.DailyPlanResponse;
import health_assistant.module.dailyplan.service.DailyPlanService;
import health_assistant.utils.ClientUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ClientUtils.VERSION + "/daily-plans")
@RequiredArgsConstructor
public class DailyPlanController {
    private final DailyPlanService dailyPlanService;

    @GetMapping("/today")
    public ResponseEntity<DefaultRes<DailyPlanResponse>> today() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, dailyPlanService.today()));
    }
}
