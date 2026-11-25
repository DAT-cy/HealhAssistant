package health_assistant.module.coach.dto;

/**
 * Nguồn tham khảo của một phương án lộ trình.
 * kind: INTERNAL_DOCUMENT (tài liệu nội bộ đã duyệt), DISEASE_CATALOG (hướng dẫn trong danh mục bệnh),
 * EXTERNAL (nguồn công khai bên ngoài do AI dẫn, chưa được bác sĩ xác nhận).
 */
public record RoadmapReference(String kind, String title, String organization, String url) {
    public static final String INTERNAL_DOCUMENT = "INTERNAL_DOCUMENT";
    public static final String DISEASE_CATALOG = "DISEASE_CATALOG";
    public static final String EXTERNAL = "EXTERNAL";
}
