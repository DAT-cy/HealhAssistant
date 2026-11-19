package health_assistant.module.profile.dto;

import jakarta.validation.constraints.NotNull;

/** Bật / tắt đồng ý sử dụng dữ liệu hồ sơ (không đụng tới các trường khác của hồ sơ). */
public record ConsentRequest(@NotNull Boolean consent) {}
