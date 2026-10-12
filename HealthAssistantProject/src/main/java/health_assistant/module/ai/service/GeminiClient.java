package health_assistant.module.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import health_assistant.module.coach.config.GeminiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiClient {
    private final GeminiProperties properties;
    private final ObjectMapper objectMapper;
    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://generativelanguage.googleapis.com/v1beta/models")
            .build();

    public boolean isConfigured() {
        return properties.getApiKey() != null && !properties.getApiKey().isBlank();
    }

    public String generateJson(String prompt, JsonNode schema) {
        if (!isConfigured()) {
            throw new GeminiException("Gemini API key is not configured.");
        }

        ObjectNode body = objectMapper.createObjectNode();
        body.putArray("contents")
                .addObject()
                .putArray("parts")
                .addObject()
                .put("text", prompt);

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
