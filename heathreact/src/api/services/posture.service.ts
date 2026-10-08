import { apiClient } from '../client';
import { Point3D, PostureAssessmentResponse, PostureView } from '../types';
import { apiVersion } from '@/config/api.config';

export interface PostureRequest {
  leftShoulder: Point3D; rightShoulder: Point3D; leftHip: Point3D; rightHip: Point3D;
  leftEar: Point3D; rightEar: Point3D; neck: Point3D; view: PostureView;
}
export const postureService = { assess: (body: PostureRequest) => apiClient.request<PostureAssessmentResponse>(`${apiVersion}/posture/assess`, { method: 'POST', body: JSON.stringify(body) }) };
