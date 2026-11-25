import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';
import { knowledgeService } from '@/api/services/knowledge.service';
import type { RoadmapReference } from '@/api/types';
import RoadmapReferences from './RoadmapReferences';

jest.mock('@/api/services/knowledge.service', () => ({ knowledgeService: { reference: jest.fn() } }));

const renderRefs = (references: RoadmapReference[]) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <RoadmapReferences references={references} />
  </QueryClientProvider>,
);

describe('RoadmapReferences', () => {
  beforeEach(() => jest.clearAllMocks());

  it('hiển thị nhãn từng loại nguồn', async () => {
    await renderRefs([
      { kind: 'INTERNAL_DOCUMENT', title: 'Hướng dẫn tăng huyết áp', organization: 'Bộ Y tế', documentId: 3 },
      { kind: 'DISEASE_CATALOG', title: 'Hướng dẫn bệnh lý: Tăng huyết áp', diseaseCode: 'HTN' },
      { kind: 'EXTERNAL', title: 'WHO physical activity', organization: 'WHO', url: 'https://www.who.int/x' },
    ]);
    expect(screen.getByText('Nguồn tham khảo')).toBeTruthy();
    expect(screen.getByText('Tài liệu nội bộ')).toBeTruthy();
    expect(screen.getByText('Danh mục bệnh')).toBeTruthy();
    expect(screen.getByText('Nguồn ngoài')).toBeTruthy();
  });

  it('bấm tài liệu nội bộ thì tải và hiện nội dung xem trước', async () => {
    jest.mocked(knowledgeService.reference).mockResolvedValue({
      kind: 'INTERNAL_DOCUMENT', title: 'Hướng dẫn tăng huyết áp', organization: 'Bộ Y tế', url: 'https://moh.gov.vn/a',
      description: 'Tóm tắt', content: 'Đi bộ nhanh 30 phút mỗi ngày.', truncated: false,
    });
    await renderRefs([{ kind: 'INTERNAL_DOCUMENT', title: 'Hướng dẫn tăng huyết áp', documentId: 3 }]);
    fireEvent.press(screen.getByText('Hướng dẫn tăng huyết áp'));
    expect(await screen.findByText('Đi bộ nhanh 30 phút mỗi ngày.')).toBeTruthy();
    expect(knowledgeService.reference).toHaveBeenCalledWith(expect.objectContaining({ documentId: 3 }));
    expect(await screen.findByText('Mở trang nguồn')).toBeTruthy();
  });

  it('nguồn ngoài: không gọi API, có nút mở trang', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderRefs([{ kind: 'EXTERNAL', title: 'CDC', url: 'https://www.cdc.gov/a' }]);
    fireEvent.press(screen.getByText('CDC'));
    expect(await screen.findByTestId('reference-preview')).toBeTruthy();
    fireEvent.press(screen.getByText('Mở trang nguồn'));
    expect(open).toHaveBeenCalledWith('https://www.cdc.gov/a');
    expect(knowledgeService.reference).not.toHaveBeenCalled();
    expect(screen.getAllByText(/chưa được bác sĩ xác nhận/).length).toBeGreaterThan(0);
  });

  it('bấm Đóng thì tắt modal xem trước', async () => {
    await renderRefs([{ kind: 'EXTERNAL', title: 'NHS', url: 'https://www.nhs.uk/a' }]);
    fireEvent.press(screen.getByText('NHS'));
    expect(await screen.findByTestId('reference-preview')).toBeTruthy();
    fireEvent.press(screen.getByText('Đóng'));
    await waitFor(() => expect(screen.queryByTestId('reference-preview')).toBeNull());
  });

  it('báo rõ khi chưa có tài liệu nội bộ', async () => {
    await renderRefs([]);
    expect(screen.getByText(/chưa có tài liệu nội bộ/)).toBeTruthy();
  });
});
