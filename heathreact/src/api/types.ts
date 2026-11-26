// Types khớp API contract của backend Spring Boot (xem .kilo/.../api-contract.md).
export interface ApiEnvelope<T> {
  statusCode: number;
  responseCode: string | null;
  responseMessage: string;
  data: T | null;
}

export type Role = 'ROLE_ADMIN' | 'ROLE_DOCTOR' | 'ROLE_USER';
export interface LoginResponse { token: string; username: string; role: Role }
export interface ProfileUser { username: string; role: Role }
export interface Point3D { x: number; y: number; z: number; visibility: number }
export type PostureView = 'FRONT' | 'SIDE';
export interface PostureAssessmentResponse {
  view: PostureView;
  reliable: boolean;
  shoulderImbalanceDegrees: number;
  pelvicTiltDegrees: number;
  forwardHeadDegrees: number;
  findings: string[];
  recommendations: string[];
}
export type WorkoutPhase = 'UP' | 'DOWN' | 'TRANSITION' | 'UNAVAILABLE';
export interface WorkoutFeedback { exercise: string; repetitionCount: number; phase: WorkoutPhase; jointAngle: number; corrections: string[]; confident: boolean }
/** Nguồn tham khảo của phương án lộ trình (backend: RoadmapReference). */
export interface RoadmapReference { kind: 'INTERNAL_DOCUMENT' | 'DISEASE_CATALOG' | 'EXTERNAL'; title: string; organization?: string | null; url?: string | null; documentId?: number | null; diseaseCode?: string | null }
/** Nội dung xem trước của một nguồn tham khảo nội bộ. */
export interface KnowledgeReferencePreview { kind: string; title: string; organization: string | null; url: string | null; description: string | null; content: string; truncated: boolean }
export interface GeminiRoadmapResponse { title: string; overview: string; weeklyPlan: string[]; safetyNotes: string[]; source: string; references?: RoadmapReference[] | null }

// 6 bước nghiệp vụ bắt buộc của sản phẩm.
export type OnboardingFlags = 'profileComplete' | 'hasPostureReport' | 'hasRoadmap' | 'hasTodayPlan';
