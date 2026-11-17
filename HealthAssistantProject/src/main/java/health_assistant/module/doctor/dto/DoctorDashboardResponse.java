package health_assistant.module.doctor.dto;

public record DoctorDashboardResponse(long managedDiseases, long diseasesRequiringReview, long pending,
                                      long inReview, long needMoreInfo, long completed, long rejected,
                                      long assignedPatients, boolean online) {}
