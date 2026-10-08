import { useCallback, useState } from 'react';
import { GeminiRoadmapResponse } from '@/api/types';
import { ApiError } from '@/api/client';
import { coachService } from '@/api/services/coach.service';

type State = { status: 'idle' | 'loading' | 'success' | 'error'; data: GeminiRoadmapResponse | null; message: string };

// Roadmap là AI call nên có timeout dài; lỗi hiển thị rõ ràng, không nuốt lỗi.
export function useRoadmap() {
  const [state, setState] = useState<State>({ status: 'idle', data: null, message: '' });

  const generate = useCallback(async (goal: string, weeks: number, postureSummary?: string, restrictions?: string) => {
    setState({ status: 'loading', data: null, message: '' });
    try {
      const data = await coachService.roadmap({ goal, weeks, postureSummary, restrictions });
      setState({ status: 'success', data, message: '' });
      return data;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Không thể tạo lộ trình lúc này.';
      setState({ status: 'error', data: null, message });
      return null;
    }
  }, []);

  return { ...state, generate };
}
