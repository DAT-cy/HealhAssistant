import { useCallback, useRef, useState } from 'react';
import { GeminiRoadmapResponse } from '@/api/types';
import { ApiError } from '@/api/client';
import { coachService, RoadmapSlotRequest } from '@/api/services/coach.service';

type State = { status: 'idle' | 'loading' | 'success' | 'error'; data: GeminiRoadmapResponse | null; message: string; canRetry: boolean };

// Roadmap là AI call nên có timeout dài; lỗi hiển thị rõ ràng, không nuốt lỗi.
export function useRoadmap() {
  const [state, setState] = useState<State>({ status: 'idle', data: null, message: '', canRetry: false });
  const [options, setOptions] = useState<GeminiRoadmapResponse[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  const attempts = useRef(0);

  const generate = useCallback(async (goal: string, weeks: number, schedule: RoadmapSlotRequest[], postureSummary?: string, restrictions?: string) => {
    if (attempts.current >= 3) {
      setState({ status: 'error', data: null, message: 'Đã thử lại quá số lần cho phép. Vui lòng thử lại sau.', canRetry: false });
      return null;
    }
    attempts.current += 1;
    setOptions([]);
    setPreviewId(null);
    setState({ status: 'loading', data: null, message: '', canRetry: false });
    try {
      const preview = await coachService.preview({ goal, weeks, schedule, postureSummary, restrictions });
      setOptions(preview.options);
      setPreviewId(preview.previewId);
      attempts.current = 0;
      setState({ status: 'success', data: null, message: '', canRetry: false });
      return preview.options;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Không thể tạo lộ trình lúc này.';
      const retryable = error instanceof ApiError
        && (error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500)
        && error.code !== 'AI-ERR-CONFIG' && error.code !== 'AI-ERR-AUTH';
      setState({ status: 'error', data: null, message, canRetry: retryable && attempts.current < 3 });
      return null;
    }
  }, []);

  const activate = useCallback(async (plan: GeminiRoadmapResponse, optionIndex: number, title?: string, draftId?: number | null) => {
    setState({ status: 'loading', data: plan, message: '', canRetry: false });
    try {
      if (!previewId) throw new Error('Hãy tạo lại bản xem trước trước khi kích hoạt.');
      await coachService.activate(previewId, optionIndex, title, draftId);
      setActivated(true);
      setState({ status: 'success', data: plan, message: '', canRetry: false });
      return true;
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error ? error.message : 'Không thể kích hoạt lộ trình.';
      setState({ status: 'error', data: plan, message, canRetry: false });
      return false;
    }
  }, [previewId]);

  return { ...state, options, previewId, activated, generate, activate };
}
