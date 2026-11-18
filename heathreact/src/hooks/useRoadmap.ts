import { useCallback, useRef, useState } from 'react';
import { GeminiRoadmapResponse } from '@/api/types';
import { ApiError } from '@/api/client';
import { coachService, RoadmapSlotRequest } from '@/api/services/coach.service';

type State = { status: 'idle' | 'loading' | 'success' | 'error'; data: GeminiRoadmapResponse | null; message: string; canRetry: boolean; routingDecision: string | null; routingMessage: string };

// Roadmap là AI call nên có timeout dài; lỗi hiển thị rõ ràng, không nuốt lỗi.
export function useRoadmap() {
  const [state, setState] = useState<State>({ status: 'idle', data: null, message: '', canRetry: false, routingDecision: null, routingMessage: '' });
  const [options, setOptions] = useState<GeminiRoadmapResponse[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  const [routingDecision, setRoutingDecision] = useState<string | null>(null);
  const [routingMessage, setRoutingMessage] = useState('');
  const attempts = useRef(0);

  const generate = useCallback(async (goal: string, weeks: number, schedule: RoadmapSlotRequest[], postureSummary?: string, restrictions?: string, diseaseCodes?: string[]) => {
    if (attempts.current >= 3) {
      setState({ status: 'error', data: null, message: 'Đã thử lại quá số lần cho phép. Vui lòng thử lại sau.', canRetry: false, routingDecision, routingMessage });
      return null;
    }
    attempts.current += 1;
    setOptions([]);
    setPreviewId(null);
    setRoutingDecision(null);
    setRoutingMessage('');
    setState({ status: 'loading', data: null, message: '', canRetry: false, routingDecision: null, routingMessage: '' });
    try {
      const preview = await coachService.preview({ goal, weeks, schedule, postureSummary, restrictions, diseaseCodes });
      setOptions(preview.options);
      setPreviewId(preview.previewId);
      setRoutingDecision(preview.routingDecision ?? 'AUTO_ROADMAP');
      setRoutingMessage(preview.routingReason ?? '');
      attempts.current = 0;
      setState({ status: 'success', data: null, message: '', canRetry: false, routingDecision: preview.routingDecision ?? 'AUTO_ROADMAP', routingMessage: preview.routingReason ?? '' });
      return preview;
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Không thể tạo lộ trình lúc này.';
      const retryable = error instanceof ApiError
        && (error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500)
        && error.code !== 'AI-ERR-CONFIG' && error.code !== 'AI-ERR-AUTH';
      setState({ status: 'error', data: null, message, canRetry: retryable && attempts.current < 3, routingDecision: null, routingMessage: '' });
      return null;
    }
  }, [routingDecision, routingMessage]);

  const activate = useCallback(async (plan: GeminiRoadmapResponse, optionIndex: number, title?: string, draftId?: number | null, startDate?: string) => {
    setState({ status: 'loading', data: plan, message: '', canRetry: false, routingDecision, routingMessage });
    try {
      if (!previewId) throw new Error('Hãy tạo lại bản xem trước trước khi kích hoạt.');
      await coachService.activate(previewId, optionIndex, title, draftId, startDate);
      setActivated(true);
      setState({ status: 'success', data: plan, message: '', canRetry: false, routingDecision, routingMessage });
      return true;
    } catch (error) {
      const message = error instanceof ApiError || error instanceof Error ? error.message : 'Không thể kích hoạt lộ trình.';
      setState({ status: 'error', data: plan, message, canRetry: false, routingDecision, routingMessage });
      return false;
    }
  }, [previewId, routingDecision, routingMessage]);

  return { ...state, options, previewId, activated, routingDecision, routingMessage, generate, activate };
}
