package health_assistant.module.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import health_assistant.module.coach.config.GeminiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import java.net.ConnectException;
import java.util.concurrent.TimeoutException;

@Service
@Slf4j
public class GeminiClient {
    private final GeminiProperties properties;
    private final ObjectMapper objectMapper;
    private final WebClient webClient;
    /** true khi gọi qua proxy (vd. ShopAIKey) thay vì Google trực tiếp. */
    private final boolean usesProxy;

    public GeminiClient(GeminiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        String configuredBaseUrl = properties.getBaseUrl();
        String baseUrl = configuredBaseUrl == null || configuredBaseUrl.isBlank()
                ? "https://generativelanguage.googleapis.com/v1beta"
                : configuredBaseUrl.replaceAll("/+$", "");
        this.usesProxy = !baseUrl.contains("generativelanguage.googleapis.com");
        // Ảnh/base64 có thể lớn hơn giới hạn mặc định 256KB của WebClient.
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl + "/models")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                .build();
        log.info("Gemini client: baseUrl={}, model={}, configured={}", baseUrl, properties.getModel(), isConfigured());
    }

    public boolean isConfigured() {
        return properties.getApiKey() != null && !properties.getApiKey().isBlank();
    }

    /**
     * Tuỳ chọn cho từng loại gọi AI.
     * maxOutputTokens: giới hạn độ dài trả lời (chat ngắn → nhỏ, tránh model lặp vô tận tới hết token).
     * timeout: null = dùng GEMINI_TIMEOUT. retries: số lần thử lại khi quá thời gian / lỗi 5xx của proxy.
     */
    public record Options(int maxOutputTokens, java.time.Duration timeout, int retries) {
        public static final Options DEFAULT = new Options(8192, null, 0);
        /** Chat: câu trả lời ngắn, chờ tối đa 40s, thử lại 1 lần. */
        public static final Options CHAT = new Options(1024, java.time.Duration.ofSeconds(40), 1);
        /**
         * Lộ trình: bình thường 2–10s, nhưng proxy thỉnh thoảng treo không trả gì.
         * Chờ tối đa 35s/lần, thử lại 2 lần (tối đa ~105s, dưới mức chờ 150s của app).
         */
        public static final Options ROADMAP = new Options(8192, java.time.Duration.ofSeconds(35), 2); // 8192: tránh JSON bị cắt giữa chừng
    }

    public String generateJson(String prompt, JsonNode schema) {
        return generateJson(prompt, schema, null, null);
    }

    public String generateJson(String prompt, JsonNode schema, Options options) {
        return generateJson(prompt, schema, null, null, options);
    }

    public String generateJson(String prompt, JsonNode schema, String imageMimeType, String imageBase64) {
        return generateJson(prompt, schema, imageMimeType, imageBase64, Options.DEFAULT);
    }

    public String generateJson(String prompt, JsonNode schema, String imageMimeType, String imageBase64, Options options) {
        Options opts = options == null ? Options.DEFAULT : options;
        for (int attempt = 0; ; attempt++) {
            try {
                return generateOnce(prompt, schema, imageMimeType, imageBase64, opts);
            } catch (GeminiException exception) {
                boolean retryable = exception.getKind() == GeminiException.Kind.TIMEOUT
                        || exception.getKind() == GeminiException.Kind.SERVER
                        || exception.getKind() == GeminiException.Kind.NETWORK;
                if (!retryable || attempt >= opts.retries()) throw exception;
                log.warn("Gemini {} – thử lại lần {}", exception.getKind(), attempt + 1);
            }
        }
    }

    private String generateOnce(String prompt, JsonNode schema, String imageMimeType, String imageBase64, Options opts) {
        if (!isConfigured()) {
            throw new GeminiException(GeminiException.Kind.CONFIGURATION, "Gemini API is not configured.");
        }

        ObjectNode body = objectMapper.createObjectNode();
        var parts = body.putArray("contents").addObject().putArray("parts");
        parts.addObject().put("text", prompt);
        if (imageBase64 != null && imageMimeType != null) {
            parts.addObject().putObject("inlineData")
                    .put("mimeType", imageMimeType)
                    .put("data", imageBase64);
        }

        ObjectNode generationConfig = body.putObject("generationConfig");
        generationConfig.put("responseMimeType", "application/json");
        generationConfig.set("responseSchema", schema);
        generationConfig.put("temperature", 0.3);
        // Đủ chỗ cho JSON lộ trình dài; tắt "thinking" của 2.5-flash để không ăn mất token trả lời.
        generationConfig.put("maxOutputTokens", opts.maxOutputTokens());
        String model = properties.getModel() == null ? "" : properties.getModel();
        if (model.startsWith("gemini-2.5-flash")) {
            generationConfig.putObject("thinkingConfig").put("thinkingBudget", 0);
        } else if (model.startsWith("gemini-3")) {
            // Dòng 3.x "suy nghĩ" mặc định rất lâu → JSON dài dễ quá thời gian chờ. Giảm xuống mức thấp.
            generationConfig.putObject("thinkingConfig").put("thinkingLevel", "low");
        }

        long startedAt = System.currentTimeMillis();
        try {
            JsonNode response = webClient.post()
                    // ShopAIKey: .../models/{model}:generateContent?key=<API_KEY> (giữ thêm header cho Google gốc).
                    .uri("/{model}:generateContent?key={key}", properties.getModel(), properties.getApiKey())
                    .header("x-goog-api-key", properties.getApiKey())
                    // Proxy kiểu ShopAIKey xác thực bằng Bearer token; Google bỏ qua header này.
                    .headers(headers -> { if (usesProxy) headers.setBearerAuth(properties.getApiKey()); })
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(opts.timeout() == null ? properties.getTimeout() : opts.timeout())
                    .block();

            String content = contentOf(response);
            if (content != null) {
                log.info("Gemini ok in {} ms (finishReason={}, {} ký tự)", System.currentTimeMillis() - startedAt,
                        response.path("candidates").path(0).path("finishReason").asText(null), content.length());
                return extractJson(content);
            }
            String raw = response == null ? "null" : response.toString();
            log.warn("Gemini response had no usable text. finishReason={}, body={}",
                    response == null ? null : response.path("candidates").path(0).path("finishReason").asText(null), truncate(raw));
            throw new GeminiException(GeminiException.Kind.INVALID_RESPONSE, "Gemini returned no valid content: " + truncate(raw));
        } catch (WebClientResponseException exception) {
            int status = exception.getStatusCode().value();
            String upstream = truncate(exception.getResponseBodyAsString());
            log.warn("Gemini API returned HTTP {}: {}", status, upstream);
            GeminiException.Kind kind = status == 401 || status == 403
                    ? GeminiException.Kind.AUTHENTICATION
                    : status == 429 ? GeminiException.Kind.QUOTA
                    : status >= 500 ? GeminiException.Kind.SERVER
                    : GeminiException.Kind.INVALID_RESPONSE;
            // Không gắn exception gốc: message của nó chứa URL có ?key=.
            throw new GeminiException(kind, "Gemini upstream HTTP " + status + ": " + upstream);
        } catch (GeminiException exception) {
            throw exception;
        } catch (Exception exception) {
            log.warn("Gemini API request failed ({}: {})", exception.getClass().getSimpleName(), truncate(exception.getMessage()));
            Throwable cause = exception;
            while (cause != null && cause.getCause() != cause) {
                if (cause instanceof TimeoutException) {
                    throw new GeminiException(GeminiException.Kind.TIMEOUT, "Gemini request timed out.", exception);
                }
                if (cause instanceof ConnectException) {
                    throw new GeminiException(GeminiException.Kind.NETWORK, "Gemini network request failed.", exception);
                }
                cause = cause.getCause();
            }
            throw new GeminiException(GeminiException.Kind.NETWORK, "Gemini request failed.", exception);
        }
    }

    /**
     * Lấy nội dung trả lời từ response. Bỏ phần "thought". Một số model 3.x qua proxy lại trả kết quả
     * dưới dạng functionCall giả (vd. write_file với args.Content = JSON) thay vì text → lấy JSON từ args.
     */
    static String contentOf(JsonNode response) {
        if (response == null) return null;
        for (JsonNode candidate : response.path("candidates")) {
            for (JsonNode part : candidate.path("content").path("parts")) {
                if (part.path("thought").asBoolean(false)) continue;
                JsonNode text = part.get("text");
                if (text != null && text.isTextual() && !text.asText().isBlank()) return text.asText();
            }
        }
        for (JsonNode candidate : response.path("candidates")) {
            for (JsonNode part : candidate.path("content").path("parts")) {
                JsonNode args = part.path("functionCall").path("args");
                if (!args.isObject() || args.isEmpty()) continue;
                for (var it = args.fields(); it.hasNext(); ) {
                    JsonNode value = it.next().getValue();
                    if (value.isTextual()) {
                        String trimmed = value.asText().trim();
                        if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith("```")) return trimmed;
                    }
                }
                return args.toString(); // args chính là object kết quả
            }
        }
        return null;
    }

    /** Cắt ngắn nội dung để log, không bao giờ in API key. */
    private String truncate(String value) {
        if (value == null) return "";
        String safe = properties.getApiKey() == null || properties.getApiKey().isBlank() ? value : value.replace(properties.getApiKey(), "***");
        return safe.length() > 800 ? safe.substring(0, 800) + "…" : safe;
    }

    /**
     * Lấy phần JSON từ câu trả lời của model. Một số proxy (vd. ShopAIKey) bỏ qua responseMimeType
     * và bọc JSON trong ```json ... ``` hoặc thêm chữ trước/sau. Không đụng tới nội dung nếu đã là JSON.
     */
    static String extractJson(String raw) {
        if (raw == null) return null;
        String value = raw.trim();
        if (value.startsWith("```")) {
            int firstNewline = value.indexOf('\n');
            value = firstNewline >= 0 ? value.substring(firstNewline + 1) : value.substring(3);
            int fence = value.lastIndexOf("```");
            if (fence >= 0) value = value.substring(0, fence);
            value = value.trim();
        }
        if (value.startsWith("{") || value.startsWith("[")) return value;
        int objectStart = value.indexOf('{');
        int arrayStart = value.indexOf('[');
        int start = objectStart < 0 ? arrayStart : arrayStart < 0 ? objectStart : Math.min(objectStart, arrayStart);
        if (start < 0) return value;
        char close = value.charAt(start) == '{' ? '}' : ']';
        int end = value.lastIndexOf(close);
        return end > start ? value.substring(start, end + 1) : value.substring(start);
    }
}
