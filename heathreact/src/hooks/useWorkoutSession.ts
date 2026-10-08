import { useCallback, useRef, useState } from 'react';
import { WorkoutFeedback } from '@/api/types';
import { ApiError } from '@/api/client';
import { workoutService } from '@/api/services/workout.service';

type State = { status: 'idle' | 'loading' | 'error'; message: string };

// Camera loop gọi track mỗi frame; chỉ giữ feedback cuối cùng để render.
export function useWorkoutSession() {
  const [feedback, setFeedback] = useState<WorkoutFeedback | null>(null);
  const [state, setState] = useState<State>({ status: 'idle', message: '' });
  const sessionId = useRef<string | null>(null);

  const start = useCallback(() => {
    sessionId.current = `s-${Date.now()}`;
    setFeedback(null);
    setState({ status: 'idle', message: '' });
  }, []);

  const stop = useCallback(() => {
    sessionId.current = null;
    setFeedback(null);
  }, []);

  const end = useCallback(async (exercise = 'squat') => {
    const activeSessionId = sessionId.current;
    if (!activeSessionId) return null;
    try {
      const result = await workoutService.end(activeSessionId, exercise);
      sessionId.current = null;
      return result;
    } catch (error) {
      setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không thể lưu buổi tập.' });
      return null;
    }
  }, []);

  const track = useCallback(async (exercise: string, jointAngle: number, visibility: number) => {
    if (!sessionId.current) return null;
    setState((previous) => ({ ...previous, status: 'loading' }));
    try {
      const result = await workoutService.track(exercise, jointAngle, visibility, sessionId.current);
      setFeedback(result);
      setState({ status: 'idle', message: '' });
      return result;
    } catch (error) {
      setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Không theo dõi được bài tập.' });
      return null;
    }
  }, []);

  return { feedback, state, start, stop, end, track };
}
