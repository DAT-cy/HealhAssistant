package health_assistant.module.users.controller;

import health_assistant.config.response.DefaultRes;
import health_assistant.config.response.ResponseMessage;
import health_assistant.config.response.StatusCode;
import health_assistant.module.coach.repository.RoadmapRecordRepository;
import health_assistant.module.knowledge.repository.KnowledgeDocumentRepository;
import health_assistant.module.doctor.entity.DoctorProfile;
import health_assistant.module.doctor.repository.DoctorProfileRepository;
import health_assistant.module.users.dto.response.AdminDashboardResponse;
import health_assistant.module.users.dto.response.AdminUserResponse;
import health_assistant.module.users.entity.User;
import health_assistant.module.users.repository.UserMapper;
import health_assistant.utils.ClientUtils;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping(ClientUtils.VERSION + "/admin/users")
@Tag(name = "03. Users management")
@RequiredArgsConstructor
public class AdminController {
    private final UserMapper userMapper;
    private final KnowledgeDocumentRepository documentRepository;
    private final RoadmapRecordRepository roadmapRepository;
    private final DoctorProfileRepository doctorRepository;

    @GetMapping
    public ResponseEntity<DefaultRes<List<AdminUserResponse>>> users(
            @RequestParam(required = false) @Size(max = 120) String q,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean enabled) {
        String normalizedRole = role == null || role.isBlank() ? null : role.trim().toUpperCase(Locale.ROOT);
        if (normalizedRole != null && !List.of("ROLE_ADMIN", "ROLE_DOCTOR", "ROLE_USER").contains(normalizedRole)) {
            throw new IllegalArgumentException("Vai trò không hợp lệ.");
        }
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_LIST,
                userMapper.findAdminUsers(q == null ? null : q.trim(), normalizedRole, enabled).stream().map(this::toResponse).toList()));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<DefaultRes<AdminDashboardResponse>> dashboard() {
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.GET_ONE, new AdminDashboardResponse(
                userMapper.countUsers(null, null), userMapper.countUsers(null, true), doctorRepository.countByActiveTrue(), doctorRepository.findAllByActiveTrueOrderByUpdatedAtAsc().stream().filter(DoctorProfile::isOnline).count(), 0,
                documentRepository.countByDeletedAtIsNull(), 0,
                documentRepository.countByStatusAndDeletedAtIsNull("REJECTED"),
                roadmapRepository.count(), 0, roadmapRepository.countByStatus("ACTIVE"))));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<DefaultRes<AdminUserResponse>> updateStatus(@PathVariable Long id, @RequestParam boolean enabled) {
        User user = userMapper.findByUserId(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));
        if (user.getRole() != null && "ROLE_ADMIN".equals(user.getRole().name())) {
            throw new IllegalArgumentException("Không thể khóa tài khoản quản trị viên.");
        }
        if (userMapper.updateEnabled(id, enabled) == 0) throw new IllegalArgumentException("Không thể cập nhật trạng thái người dùng.");
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED,
                userMapper.findByUserId(id).map(this::toResponse).orElseThrow()));
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<DefaultRes<AdminUserResponse>> updateRole(@PathVariable Long id, @RequestParam String role) {
        User user = userMapper.findByUserId(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy người dùng."));
        String normalized = role == null ? "" : role.trim().toUpperCase(Locale.ROOT);
        if (!List.of("ROLE_ADMIN", "ROLE_DOCTOR", "ROLE_USER").contains(normalized)) throw new IllegalArgumentException("Vai trò không hợp lệ.");
        if (userMapper.updateRole(id, normalized) == 0) throw new IllegalArgumentException("Không thể cập nhật vai trò.");
        if ("ROLE_DOCTOR".equals(normalized)) {
            DoctorProfile profile = doctorRepository.findByUserId(id).orElseGet(DoctorProfile::new);
            profile.setUserId(id); profile.setFullName(user.getDisplayName() == null ? user.getUsername() : user.getDisplayName()); profile.setSpecialty("Chưa phân chuyên khoa"); profile.setActive(true); doctorRepository.save(profile);
        }
        return ResponseEntity.ok(DefaultRes.res(StatusCode.OK, ResponseMessage.UPDATED, userMapper.findByUserId(id).map(this::toResponse).orElseThrow()));
    }

    private AdminUserResponse toResponse(User user) {
        return new AdminUserResponse(user.getUserId(), user.getUsername(), user.getEmail(), user.getDisplayName(),
                user.getRole(), Boolean.TRUE.equals(user.getEnable()), user.isEmailVerified(), user.getCreatedAt());

    }
}
