import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Linking } from 'react-native';
import RoadmapReferences from './RoadmapReferences';

describe('RoadmapReferences', () => {
  it('hiển thị nguồn nội bộ, danh mục bệnh và nguồn ngoài có link', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(<RoadmapReferences references={[
      { kind: 'INTERNAL_DOCUMENT', title: 'Hướng dẫn tăng huyết áp', organization: 'Bộ Y tế', url: null },
      { kind: 'DISEASE_CATALOG', title: 'Hướng dẫn bệnh lý: Tăng huyết áp', organization: 'Danh mục bệnh lý nội bộ' },
      { kind: 'EXTERNAL', title: 'WHO physical activity', organization: 'WHO', url: 'https://www.who.int/x' },
    ]} />);
    expect(screen.getByText('Nguồn tham khảo')).toBeTruthy();
    expect(screen.getByText('Tài liệu nội bộ')).toBeTruthy();
    expect(screen.getByText('Danh mục bệnh')).toBeTruthy();
    expect(screen.getByText('Nguồn ngoài')).toBeTruthy();
    fireEvent.press(screen.getByText('WHO physical activity'));
    expect(open).toHaveBeenCalledWith('https://www.who.int/x');
  });

  it('báo rõ khi chưa có tài liệu nội bộ', async () => {
    await render(<RoadmapReferences references={[]} />);
    expect(screen.getByText(/chưa có tài liệu nội bộ/)).toBeTruthy();
  });

  it('cảnh báo khi chỉ có nguồn ngoài', async () => {
    await render(<RoadmapReferences references={[{ kind: 'EXTERNAL', title: 'CDC', url: 'https://www.cdc.gov/a' }]} />);
    expect(screen.getByText(/chưa được bác sĩ xác nhận/)).toBeTruthy();
  });
});
