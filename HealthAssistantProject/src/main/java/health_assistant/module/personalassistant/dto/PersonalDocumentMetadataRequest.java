package health_assistant.module.personalassistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PersonalDocumentMetadataRequest(@NotBlank @Size(max = 200) String title,
                                             @Size(max = 1000) String description) {}
