package health_assistant.module.users.dto.response;

public record AdminDashboardResponse(long totalUsers, long activeUsers, long totalDoctors,
                                     long onlineDoctors, long totalDiseases, long totalDocuments,
                                     long documentsProcessing, long documentsFailed, long totalRoadmaps,
                                     long roadmapsAwaitingDoctor, long roadmapsConfirmed) {}
