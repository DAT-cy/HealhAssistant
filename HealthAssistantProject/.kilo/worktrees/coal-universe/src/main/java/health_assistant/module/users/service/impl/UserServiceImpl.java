package health_assistant.module.users.service.impl;

import health_assistant.config.response.CommonException;
import health_assistant.config.response.ErrorCode;
import health_assistant.config.app.JwtService;
import health_assistant.module.users.dto.request.LoginRequest;
import health_assistant.module.users.dto.request.SignUpRequest;
import health_assistant.module.users.dto.response.LoginResponse;
import health_assistant.module.users.dto.response.ProfileUser;
import health_assistant.module.users.entity.Role;
import health_assistant.module.users.entity.User;
import health_assistant.module.users.repository.UserMapper;
import health_assistant.module.users.service.UserService;
import health_assistant.utils.SecurityUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AccountExpiredException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;



    @Override
    public LoginResponse login(LoginRequest request) {
        log.info("Attempting login for user: {}", request.getUsername());

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );

            User user = (User) authentication.getPrincipal();

            String jwtToken = jwtService.generateToken(user);

            log.info("User logged in successfully: {}", request.getUsername());
            return LoginResponse.builder()
                    .username(user.getUsername())
                    .token(jwtToken)
                    .role(user.getRole())
                    .build();
        } catch (AccountExpiredException | DisabledException e) {
            throw new CommonException(ErrorCode.ACCOUNT_DEACTIVATE);
        }
        catch (Exception e) {
            throw new CommonException(ErrorCode.WRONG_PASSWORD);
        }
    }
    @Override
    public Boolean signUp(SignUpRequest request) {
        User user = saveUser(request);
        userMapper.insertUser(user);
        return true;
    }

    @Override
    public ProfileUser getProfile() {
        User user = SecurityUtils.getCurrentUser();
        if (user == null) {
            throw new CommonException(ErrorCode.FORBIDDEN_ERROR);
        }
        return ProfileUser.builder()
                .role(user.getRole())
                .username(user.getUsername())
                .build();

    }

    private User saveUser(SignUpRequest request) {
        User user = findUserByEmail(request.getEmail());
        if(user == null) {
            user = new User();
            user.setUsername(request.getEmail());
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setRole(Role.ROLE_USER);
            user.setEnable(true);
            user.setIsDeleted(false);
            return user;
        }
        else {
            throw new CommonException(ErrorCode.USERNAME_ALREADY_EXISTS);
        }
    }

    private User findUserByEmail(String email) {
         return userMapper.findByUsername(email).orElse(null);
    }



    @Override
    public void initAdminUser() {
        if (userMapper.countAdminUsers() == 0) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin"));
            admin.setEnable(true);
            admin.setIsDeleted(false);
            admin.setRole(Role.ROLE_ADMIN);
            userMapper.insertUser(admin);
            User user = new User();
            user.setUsername("user");
            user.setPassword(passwordEncoder.encode("user"));
            user.setEnable(true);
            user.setIsDeleted(false);
            user.setRole(Role.ROLE_USER);
            userMapper.insertUser(user);
        }
    }


} 