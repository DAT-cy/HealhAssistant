package health_assistant;

import lombok.RequiredArgsConstructor;
import health_assistant.module.users.service.UserService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@RequiredArgsConstructor
public class HealthAssistantApplication implements CommandLineRunner {

    private final UserService userService;

    public static void main(String[] args) {
        SpringApplication.run(health_assistant.HealthAssistantApplication.class, args);
    }

    @Override
    public void run(String... args) throws Exception {
        userService.initAdminUser();
    }
} 