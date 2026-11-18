package health_assistant.module.doctor.dto;

/** Bác sĩ vừa "Yêu cầu sửa" một yêu cầu → AI cần tính lại phương án (xử lý sau khi transaction commit). */
public record RevisionRequestedEvent(Long requestId) {}
