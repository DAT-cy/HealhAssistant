package health_assistant.module.doctor.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Người dùng bổ sung thông tin khi bác sĩ chọn "Cần thêm thông tin". */
public record DoctorRequestReplyRequest(@NotBlank @Size(max = 3000) String message) {}
