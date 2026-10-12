package health_assistant.module.ai.service;

public final class AiPromptSanitizer {
    private AiPromptSanitizer() {}

    public static String sanitize(String value, int maxLength) {
        if (value == null || value.isBlank()) return "Không cung cấp";

        String sanitized = value
                .replaceAll("(?i)\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b", "[đã ẩn email]")
                .replaceAll("(?<!\\d)\\+?\\d[\\d .()\\-]{7,}\\d(?!\\d)", "[đã ẩn số điện thoại]")
                .replaceAll("[\\p{Cntrl}&&[^\\r\\n\\t]]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return sanitized.length() <= maxLength ? sanitized : sanitized.substring(0, maxLength);
    }
}
