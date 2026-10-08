package health_assistant.module.coach.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import health_assistant.module.coach.dto.GeminiRoadmapResponse;

import java.util.List;

final class RoadmapJsonMapper {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private RoadmapJsonMapper() {}

    static GeminiRoadmapResponse read(String json, String source) throws Exception {
        JsonNode node = MAPPER.readTree(json);
        return new GeminiRoadmapResponse(
                text(node, "title"),
                text(node, "overview"),
                strings(node, "weeklyPlan"),
                strings(node, "safetyNotes"),
                source);
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || !value.isTextual() || value.asText().isBlank() ? field + " unavailable" : value.asText();
    }

    private static List<String> strings(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isArray() || value.isEmpty()) {
            return List.of("No " + field + " was returned by the source.");
        }
        java.util.ArrayList<String> values = new java.util.ArrayList<>();
        value.forEach(item -> {
            if (item.isTextual() && !item.asText().isBlank()) {
                values.add(item.asText());
            }
        });
        return values.isEmpty() ? List.of("No " + field + " was returned by the source.") : values;
    }
}
