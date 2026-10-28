package health_assistant.module.users.service;

import health_assistant.module.users.dto.request.LoginRequest;
import health_assistant.module.users.dto.response.LoginResponse;
import health_assistant.module.users.dto.response.ProfileUser;

public interface UserService {
    LoginResponse login(LoginRequest request);
    void initAdminUser();
    ProfileUser getProfile();
}
