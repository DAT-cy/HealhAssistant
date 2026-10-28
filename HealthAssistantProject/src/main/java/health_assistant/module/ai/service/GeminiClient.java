package health_assistant.module.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import health_assistant.module.coach.config.GeminiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Service
@Slf4j
public class GeminiClient {
    private final GeminiProperties properties;
    private final ObjectMapper objectMapper;
    private final WebClient webClient;

    public GeminiClient(GeminiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        String configuredBaseUrl = properties.getBaseUrl();
        String baseUrl = configuredBaseUrl == null || configuredBaseUrl.isBlank()
                ? "https://generativelanguage.googleapis.com/v1beta"
                : configuredBaseUrl.replaceAll("/+$", "");
        this.webClient = WebClient.builder().baseUrl(baseUrl + "/models").build();
    }

    public boolean isConfigured() {
        return properties.getApiKey() != null && !properties.getApiKey().isBlank();
    }

    public String generateJson(String prompt, JsonNode schema) {
        return generateJson(prompt, schema, null, null);
    }

    public String generateJson(String prompt, JsonNode schema, String imageMimeType, String imageBase64) {
        if (!isConfigured()) {
            throw new GeminiException("Gemini API key is not configured.");
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
            throw new GeminiException("Gemini returned no text content.");
        } catch (WebClientResponseException exception) {
            log.warn("Gemini API returned HTTP {}.", exception.getStatusCode().value());
            throw new GeminiException("Gemini returned HTTP " + exception.getStatusCode().value() + ".", exception);
        } catch (GeminiException exception) {
            throw exception;
        } catch (Exception exception) {
            log.warn("Gemini API request failed ({})", exception.getClass().getSimpleName());
            throw new GeminiException("Gemini request failed.", exception);
        }
    }
}
