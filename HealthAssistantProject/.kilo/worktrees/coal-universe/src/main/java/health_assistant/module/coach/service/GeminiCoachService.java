package health_assistant.module.coach.service;

import health_assistant.module.coach.config.GeminiProperties;
import health_assistant.module.coach.dto.GeminiRoadmapRequest;
import health_assistant.module.coach.dto.GeminiRoadmapResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import java.util.List;

@Service
public class GeminiCoachService {
    private final GeminiProperties properties;
    private final WebClient webClient;

    public GeminiCoachService(GeminiProperties properties) {
        this.properties = properties;
        this.webClient = WebClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta/models")
                .build();
    }

    public GeminiRoadmapResponse plan(GeminiRoadmapRequest request) {
        String key = properties.getApiKey();
        if (key == null || key.isBlank()) {
            return fallback(request, "Gemini API key is not configured");
        }
        String body = """
                {
                  "contents": [{"parts": [{"text": %s}]}],
                  "generationConfig": {
                    "responseMimeType": "application/json",
                    "responseSchema": {
                      "type": "OBJECT",
                      "properties": {
                        "title": {"type": "STRING"},
                        "overview": {"type": "STRING"},
                        "weeklyPlan": {"type": "ARRAY", "items": {"type": "STRING"}},
                        "safetyNotes": {"type": "ARRAY", "items": {"type": "STRING"}}
                      },
                      "required": ["title", "overview", "weeklyPlan", "safetyNotes"],
                      "propertyOrdering": ["title", "overview", "weeklyPlan", "safetyNotes"]
                    }
                  }
                }
                """.formatted(quoteJson(prompt(request)));
        try {
            GeminiEnvelope envelope = webClient.post()
                    .uri("/{model}:generateContent?key={apiKey}", properties.getModel(), key)
                    .header("Content-Type", "application/json")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(GeminiEnvelope.class)
                    .timeout(properties.getTimeout())
                    .block();
            String text = envelope == null ? null
                    : envelope.candidates().stream()
                    .flatMap(candidate -> candidate.content().parts().stream())
                    .map(Part::text)
                    .findFirst().orElse(null);
            if (text == null || text.isBlank()) {
                return fallback(request, "Gemini returned an empty response");
            }
            return RoadmapJsonMapper.read(text, "gemini");
        } catch (WebClientResponseException exception) {
            return fallback(request, "Gemini HTTP error: " + exception.getStatusCode().value());
        } catch (Exception exception) {
            return fallback(request, "Gemini unavailable: " + exception.getClass().getSimpleName());
        }
    }

    private String prompt(GeminiRoadmapRequest request) {
        return """
                You are a certified strength and conditioning coach. Create a safe, measurable %d-week training roadmap.
                Goal: %s.
                Posture summary: %s.
                Restrictions: %s.
                Return one short overview, exactly %d weekly entries, and practical safety notes.
                Do not diagnose disease. Do not promise medical outcomes.
                """.formatted(request.weeks(), request.goal(),
                valueOrNone(request.postureSummary()), valueOrNone(request.restrictions()), request.weeks());
    }

    private GeminiRoadmapResponse fallback(GeminiRoadmapRequest request, String reason) {
        return new GeminiRoadmapResponse(
                "%d-week baseline roadmap".formatted(request.weeks()),
                "The deterministic coaching fallback is active: " + reason,
                List.of("Establish baseline movement and consistency before progression."),
                List.of("Stop if pain exceeds normal muscular effort; consult a qualified professional for persistent pain."),
                "fallback");
    }

    private String valueOrNone(String value) {
        return value == null || value.isBlank() ? "None provided" : value;
    }

    private String quoteJson(String value) {
        return "\"" + value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n") + "\"";
    }

    private record GeminiEnvelope(List<Candidate> candidates) {}
    private record Candidate(Content content) {}
    private record Content(List<Part> parts) {}
    private record Part(String text) {}
}
