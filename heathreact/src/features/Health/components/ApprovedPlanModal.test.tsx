import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { toast } from 'sonner-native';
import React from 'react';
import { coachService } from '@/api/services/coach.service';
import { renderScreen } from '@/test-utils/render';
import ApprovedPlanModal from './ApprovedPlanModal';

jest.mock('@/api/services/coach.service', () => ({ coachService: { approvedPreview: jest.fn(), activate: jest.fn() } }));
const mocked = coachService as jest.Mocked<typeof coachService>;

describe('ApprovedPlanModal', () => {
  it('hiện phương án bác sĩ đã duyệt, chọn rồi kích hoạt', async () => {
    mocked.approvedPreview.mockResolvedValue({
      previewId: 'p1', reviewRequestId: 6, routingDecision: 'AUTO_ROADMAP', routingReason: null,
      options: [
        { title: 'Đi bộ', overview: 'Nhẹ', weeklyPlan: ['Tuần đầu đi bộ'], safetyNotes: ['Dừng khi mệt'], source: 'gemini' },
        { title: 'Giãn cơ', overview: 'Phục hồi', weeklyPlan: ['Giãn cơ'], safetyNotes: ['x'], source: 'gemini' },
      ],
    } as never);
    mocked.activate.mockResolvedValue({} as never);
    const onActivated = jest.fn();
    await renderScreen(<ApprovedPlanModal requestId={6} onClose={jest.fn()} onActivated={onActivated} />);

    expect(await screen.findByText('Phương án 1: Đi bộ')).toBeTruthy();
    expect(mocked.approvedPreview).toHaveBeenCalledWith(6);
    await fireEvent.press(screen.getByTestId('approved-option-1'));
    await fireEvent.press(screen.getByTestId('approved-activate'));

    await waitFor(() => expect(onActivated).toHaveBeenCalled());
    expect(mocked.activate).toHaveBeenCalledWith('p1', 1, 'Giãn cơ');
    expect(toast.success).toHaveBeenCalledWith('Đã kích hoạt lộ trình bác sĩ duyệt', expect.anything());
  });

  it('báo lỗi từ backend (vd. yêu cầu cũ chưa có phương án)', async () => {
    const { ApiError } = jest.requireActual('@/api/client');
    mocked.approvedPreview.mockRejectedValue(new ApiError(400, 'ERR', 'Yêu cầu này được tạo trước khi có phương án AI.'));
    await renderScreen(<ApprovedPlanModal requestId={2} onClose={jest.fn()} onActivated={jest.fn()} />);
    expect(await screen.findByText('Yêu cầu này được tạo trước khi có phương án AI.')).toBeTruthy();
  });
});
