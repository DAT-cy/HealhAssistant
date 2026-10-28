import { useCallback, useState } from 'react';
import { GeminiRoadmapResponse } from '@/api/types';
import { ApiError } from '@/api/client';
import { coachService, RoadmapSlotRequest } from '@/api/services/coach.service';

type State = { status: 'idle' | 'loading' | 'success' | 'error'; data: GeminiRoadmapResponse | null; message: string };

// Roadmap là AI call nên có timeout dài; lỗi hiển thị rõ ràng, không nuốt lỗi.
export function useRoadmap() {
  const [state, setState] = useState<State>({ status: 'idle', data: null, message: '' });
  const [options, setOptions] = useState<GeminiRoadmapResponse[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

  const generate = useCallback(async (goal: string, weeks: number, schedule: RoadmapSlotRequest[], postureSummary?: string, restrictions?: string) => {
    setOptions([]);
    setPreviewId(null);
    setState({ status: 'loading', data: null, message: '' });
    try {
      const preview = await coachService.preview({ goal, weeks, schedule, postureSummary, restrictions });
      setOptions(preview.options);
      setPreviewId(preview.previewId);
      setState({ status: 'success', data: null, message: '' });
      return preview.options;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Không thể tạo lộ trình lúc này.';
      setState({ status: 'error', data: null, message });
      return null;
    }
  }, []);

  const activate = useCallback(async (plan: GeminiRoadmapResponse, optionIndex: number) => {
    setState({ status: 'loading', data: plan, message: '' });
    try {
      if (!previewId) throw new Error('Hãy tạo lại bản xem trước trước khi kích hoạt.');
      await coachService.activate(previewId, optionIndex);
      setActivated(true);
      setState({ status: 'success', data: plan, message: '' });
      return true;
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error ? error.message : 'Không thể kích hoạt lộ trình.';
      setState({ status: 'error', data: plan, message });
      return false;
    }
  }, [previewId]);

  return { ...state, options, previewId, activated, generate, activate };
}
