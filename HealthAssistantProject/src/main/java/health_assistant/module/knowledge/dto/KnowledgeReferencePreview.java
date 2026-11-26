package health_assistant.module.knowledge.dto;

/** Bản xem trước một nguồn tham khảo của lộ trình (tài liệu nội bộ đã duyệt hoặc hướng dẫn trong danh mục bệnh). */
public record KnowledgeReferencePreview(
        String kind,
        String title,
        String organization,
        String url,
        String description,
        String content,
        boolean truncated) {}
