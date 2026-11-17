package health_assistant.module.doctor.dto;

import health_assistant.module.doctor.entity.Disease;
import java.time.Instant;

public record DiseaseResponse(Long id, String code, String name, String specialty, String description,
                              String symptoms, String causes, String riskFactors, String careGuidance,
                              String referenceSource, String severity, boolean doctorRequired,
                              boolean roadmapConfirmationRequired, boolean aiAllowed, int priority,
                              String specialInstructions, boolean active, Long updatedBy, Instant updatedAt) {
    public static DiseaseResponse from(Disease d) { return new DiseaseResponse(d.getId(), d.getCode(), d.getName(), d.getSpecialty(), d.getDescription(), d.getSymptoms(), d.getCauses(), d.getRiskFactors(), d.getCareGuidance(), d.getReferenceSource(), d.getSeverity(), d.isDoctorRequired(), d.isRoadmapConfirmationRequired(), d.isAiAllowed(), d.getPriority(), d.getSpecialInstructions(), d.isActive(), d.getUpdatedBy(), d.getUpdatedAt()); }
}
