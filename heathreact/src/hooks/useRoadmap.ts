import { useCallback, useState } from 'react';
import { GeminiRoadmapResponse } from '@/api/types';
import { ApiError } from '@/api/client';
import { coachService } from '@/api/services/coach.service';

type State = { status: 'idle' | 'loading' | 'success' | 'error'; data: GeminiRoadmapResponse | null; message: string };

// Roadmap là AI call nên có timeout dài; lỗi hiển thị rõ ràng, không nuốt lỗi.
export function useRoadmap() {
  const [state, setState] = useState<State>({ status: 'idle', data: null, message: '' });
  const [options, setOptions] = useState<GeminiRoadmapResponse[]>([]);
  const [activated, setActivated] = useState(false);

  const generate = useCallback(async (goal: string, weeks: number, postureSummary?: string, restrictions?: string) => {
    setOptions([]);
    setState({ status: 'loading', data: null, message: '' });
    try {
      const data = await coachService.preview({ goal, weeks, postureSummary, restrictions });
      setOptions(data);
      setState({ status: 'success', data: null, message: '' });
      return data;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Không thể tạo lộ trình lúc này.';
      setState({ status: 'error', data: null, message });
      return null;
    }
  }, []);

  const activate = useCallback(async (plan: GeminiRoadmapResponse, weeks: number) => {
    setState({ status: 'loading', data: plan, message: '' });
    try {
      await coachService.activate(plan, weeks);
      setActivated(true);
      setState({ status: 'success', data: plan, message: '' });
      return true;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Không thể kích hoạt lộ trình.';
      setState({ status: 'error', data: plan, message });
      return false;
    }
  }, []);

  return { ...state, options, activated, generate, activate };
}
