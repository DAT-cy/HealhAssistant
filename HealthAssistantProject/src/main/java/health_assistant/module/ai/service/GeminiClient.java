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

    public String generateJson(String prompt, JsonNode schema) {
        return generateJson(prompt, schema, null, null);
    }

    public String generateJson(String prompt, JsonNode schema, String imageMimeType, String imageBase64) {
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

        try {
            JsonNode response = webClient.post()
                    .uri("/{model}:generateContent", properties.getModel())
                    .header("x-goog-api-key", properties.getApiKey())
                    // Proxy kiểu ShopAIKey xác thực bằng Bearer token; Google bỏ qua header này.
                    .headers(headers -> { if (usesProxy) headers.setBearerAuth(properties.getApiKey()); })
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(properties.getTimeout())
                    .block();

            if (response != null) {
                for (JsonNode candidate : response.path("candidates")) {
                    for (JsonNode part : candidate.path("content").path("parts")) {
                        JsonNode text = part.get("text");
                        if (text != null && text.isTextual() && !text.asText().isBlank()) {
                            return text.asText();
                        }
                    }
                }
            }
            throw new GeminiException(GeminiException.Kind.INVALID_RESPONSE, "Gemini returned no valid content.");
        } catch (WebClientResponseException exception) {
            int status = exception.getStatusCode().value();
            log.warn("Gemini API returned HTTP {}.", status);
            GeminiException.Kind kind = status == 401 || status == 403
                    ? GeminiException.Kind.AUTHENTICATION
                    : status == 429 ? GeminiException.Kind.QUOTA
                    : status >= 500 ? GeminiException.Kind.SERVER
                    : GeminiException.Kind.INVALID_RESPONSE;
            throw new GeminiException(kind, "Gemini upstream request failed.", exception);
        } catch (GeminiException exception) {
            throw exception;
        } catch (Exception exception) {
            log.warn("Gemini API request failed ({})", exception.getClass().getSimpleName());
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
}
