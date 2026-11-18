import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { ApiError } from '@/api/client';
import { adminDiseaseService } from '@/api/services/admin.service';
import type { Disease } from '@/api/services/doctor.service';
import { navigationService } from '@/routes';
import { renderScreen } from '@/test-utils/render';
import AdminDiseasesPage, { filterDiseases, validateDiseaseForm } from './Diseases';

jest.mock('@/api/services/admin.service', () => ({ adminDiseaseService: { list: jest.fn(), create: jest.fn(), deactivate: jest.fn() } }));
jest.mock('@/routes', () => ({ navigationService: { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() } }));

const mocked = adminDiseaseService as jest.Mocked<typeof adminDiseaseService>;

const disease = (patch: Partial<Disease>): Disease => ({
  id: 1, code: 'HYPERTENSION', name: 'Tăng huyết áp', specialty: 'Tim mạch', description: null, severity: 'HIGH',
  doctorRequired: true, roadmapConfirmationRequired: true, aiAllowed: false, priority: 10, specialInstructions: null, active: true, updatedAt: '2026-11-18T00:00:00Z', ...patch,
});
const data = [
  disease({}),
  disease({ id: 2, code: 'LOW_BACK_PAIN', name: 'Đau thắt lưng', specialty: 'Cơ xương khớp', severity: 'LOW', doctorRequired: false, aiAllowed: true, priority: 1 }),
  disease({ id: 3, code: 'OLD', name: 'Bệnh cũ', specialty: null, active: false }),
];
const form = { code: 'GOUT', name: 'Gout', specialty: '', description: '', severity: 'LOW' as const, doctorRequired: false, roadmapConfirmationRequired: false, aiAllowed: true, priority: '0' };

beforeEach(() => {
  mocked.list.mockResolvedValue(data);
  mocked.deactivate.mockResolvedValue(true);
});

describe('filterDiseases / validateDiseaseForm', () => {
  it('lọc theo trạng thái và tìm không dấu', () => {
    expect(filterDiseases(data, '', 'active').map((d) => d.id)).toEqual([1, 2]);
    expect(filterDiseases(data, '', 'review').map((d) => d.id)).toEqual([1]);
    expect(filterDiseases(data, '', 'inactive').map((d) => d.id)).toEqual([3]);
    expect(filterDiseases(data, 'dau that', 'all').map((d) => d.id)).toEqual([2]);
    expect(filterDiseases(data, 'tim mach', 'all').map((d) => d.id)).toEqual([1]);
  });

  it('báo lỗi mã/tên/ưu tiên, kể cả mã trùng', () => {
    expect(validateDiseaseForm(form, data)).toEqual({});
    expect(validateDiseaseForm({ ...form, code: '' }, data).code).toBe('Nhập mã bệnh.');
    expect(validateDiseaseForm({ ...form, code: 'có dấu' }, data).code).toContain('chỉ gồm');
    expect(validateDiseaseForm({ ...form, code: 'hypertension' }, data).code).toBe('Mã bệnh đã tồn tại.');
    expect(validateDiseaseForm({ ...form, name: '  ' }, data).name).toBe('Nhập tên bệnh.');
    expect(validateDiseaseForm({ ...form, priority: '101' }, data).priority).toContain('0–100');
  });
});

describe('Admin: màn quản lý bệnh lý', () => {
  it('hiện thống kê và mặc định chỉ hiện bệnh đang dùng', async () => {
    await renderScreen(<AdminDiseasesPage />);
    expect(await screen.findByText('Tăng huyết áp')).toBeTruthy();
    expect(screen.getByText('Đau thắt lưng')).toBeTruthy();
    expect(screen.queryByText('Bệnh cũ')).toBeNull();
    expect(screen.getByText('Cần bác sĩ duyệt')).toBeTruthy();
    expect(screen.getByText('Tự động')).toBeTruthy();
  });

  it('bộ lọc "Tất cả" hiện cả bệnh đã ngưng dùng', async () => {
    await renderScreen(<AdminDiseasesPage />);
    await screen.findByText('Tăng huyết áp');
    await fireEvent.press(screen.getByText('Tất cả'));
    expect(screen.getByText('Bệnh cũ')).toBeTruthy();
  });

  it('thêm bệnh: validate trước, rồi gửi đúng body (mã in hoa, chuỗi rỗng -> null)', async () => {
    mocked.create.mockImplementation(async (input) => disease({ id: 9, ...input }));
    await renderScreen(<AdminDiseasesPage />);
    await screen.findByText('Tăng huyết áp');
    await fireEvent.press(screen.getByLabelText('Thêm bệnh'));
    await fireEvent.press(screen.getByLabelText('Lưu bệnh'));
    expect(screen.getByText('Nhập tên bệnh.')).toBeTruthy();
    expect(mocked.create).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('disease-name'), ' Gout ');
    await fireEvent.changeText(screen.getByTestId('disease-code'), 'gout');
    await fireEvent(screen.getByTestId('switch-doctor-required'), 'valueChange', true);
    await fireEvent.press(screen.getByText('Trung bình'));
    await fireEvent.changeText(screen.getByTestId('disease-priority'), '20');
    await fireEvent.press(screen.getByLabelText('Lưu bệnh'));

    await waitFor(() => expect(mocked.create).toHaveBeenCalledWith({
      code: 'GOUT', name: 'Gout', specialty: null, description: null, severity: 'MODERATE',
      doctorRequired: true, roadmapConfirmationRequired: false, aiAllowed: true, priority: 20,
    }));
    expect(await screen.findByText('Đã thêm bệnh Gout.')).toBeTruthy();
    expect(mocked.list).toHaveBeenCalledTimes(2);
  });

  it('server báo lỗi khi thêm: hiện thông báo, form vẫn mở', async () => {
    mocked.create.mockRejectedValue(new ApiError(400, 'X', 'Dữ liệu không hợp lệ'));
    await renderScreen(<AdminDiseasesPage />);
    await screen.findByText('Tăng huyết áp');
    await fireEvent.press(screen.getByLabelText('Thêm bệnh'));
    await fireEvent.changeText(screen.getByTestId('disease-name'), 'Gout');
    await fireEvent.changeText(screen.getByTestId('disease-code'), 'GOUT');
    await fireEvent.press(screen.getByLabelText('Lưu bệnh'));
    expect(await screen.findByText('Dữ liệu không hợp lệ')).toBeTruthy();
    expect(screen.getByTestId('disease-name')).toBeTruthy();
  });

  it('ngưng dùng: hỏi xác nhận trước, rồi gọi API đúng id', async () => {
    await renderScreen(<AdminDiseasesPage />);
    await screen.findByText('Tăng huyết áp');
    await fireEvent.press(screen.getByLabelText('Ngưng dùng Tăng huyết áp'));
    expect(mocked.deactivate).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('Xác nhận ngưng dùng Tăng huyết áp'));
    await waitFor(() => expect(mocked.deactivate).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Đã ngưng dùng Tăng huyết áp.')).toBeTruthy();
  });

  it('thanh điều hướng chuyển sang Tổng quan / Kho tri thức', async () => {
    await renderScreen(<AdminDiseasesPage />);
    await fireEvent.press(screen.getByText('Tổng quan'));
    await fireEvent.press(screen.getByText('Kho tri thức'));
    expect(navigationService.navigate).toHaveBeenCalledWith('AdminDashboard');
    expect(navigationService.navigate).toHaveBeenCalledWith('AdminKnowledge');
  });
});
