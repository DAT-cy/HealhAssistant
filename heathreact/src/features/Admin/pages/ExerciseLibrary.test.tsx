import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { adminDiseaseService } from '@/api/services/admin.service';
import { doctorService } from '@/api/services/doctor.service';
import { exerciseAdminService, type ExerciseItem } from '@/api/services/exercise-admin.service';
import { useUserStore } from '@/stores/user';
import { renderScreen } from '@/test-utils/render';
import ExerciseLibraryPage from './ExerciseLibrary';
import { codeFromName, emptyExerciseForm, toExerciseInput, validateExerciseForm } from './exerciseForm';

jest.mock('@/api/services/exercise-admin.service', () => ({ exerciseAdminService: { list: jest.fn(), create: jest.fn(), update: jest.fn(), deactivate: jest.fn() } }));
jest.mock('@/api/services/admin.service', () => ({ adminDiseaseService: { list: jest.fn() } }));
jest.mock('@/api/services/doctor.service', () => ({ doctorService: { diseases: jest.fn() } }));
jest.mock('@/routes', () => ({ navigationService: { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() } }));

const exercises = jest.mocked(exerciseAdminService);
const disease = (code: string, name: string) => ({ id: 1, code, name, specialty: null, description: null, severity: 'LOW', doctorRequired: false, roadmapConfirmationRequired: false, aiAllowed: true, priority: 1, specialInstructions: null, active: true, updatedAt: '' });
const item = (patch: Partial<ExerciseItem>): ExerciseItem => ({
  id: 1, code: 'CHAIR_SQUAT', name: 'Squat với ghế', muscleGroup: 'Đùi, mông', difficulty: 'BEGINNER', equipment: 'Ghế',
  instructions: 'Ngồi xuống ghế rồi đứng lên.', safetyNotes: null, sets: 3, reps: '10-12', restSeconds: 60,
  commonMistakes: null, contraindications: null, active: true, contraindicatedDiseaseCodes: ['KNEE_OA'], ...patch,
});

beforeEach(() => {
  jest.clearAllMocks();
  useUserStore.setState({ role: 'ROLE_ADMIN', username: 'admin' });
  exercises.list.mockResolvedValue([item({}), item({ id: 2, code: 'OLD', name: 'Bài cũ', active: false, contraindicatedDiseaseCodes: [] })]);
  jest.mocked(adminDiseaseService.list).mockResolvedValue([disease('KNEE_OA', 'Thoái hoá khớp gối'), disease('HYPERTENSION', 'Tăng huyết áp')] as never);
  jest.mocked(doctorService.diseases).mockResolvedValue([disease('KNEE_OA', 'Thoái hoá khớp gối')] as never);
});

describe('exerciseForm', () => {
  it('tạo mã từ tên tiếng Việt và kiểm tra trường bắt buộc', () => {
    expect(codeFromName('Đạp xe tại chỗ')).toBe('DAP_XE_TAI_CHO');
    expect(validateExerciseForm(emptyExerciseForm)).toBe('Nhập tên bài tập.');
    expect(validateExerciseForm({ ...emptyExerciseForm, name: 'A', muscleGroup: 'B', instructions: 'C', sets: '30' })).toContain('1 đến 20');
    const input = toExerciseInput({ ...emptyExerciseForm, name: 'Plank', muscleGroup: 'Bụng', instructions: 'Giữ thẳng', equipment: ' ', diseaseCodes: ['A', 'B'] });
    expect(input).toMatchObject({ code: 'PLANK', equipment: null, sets: 3, restSeconds: 60, contraindicatedDiseaseCodes: 'A,B' });
  });
});

describe('Thư viện bài tập', () => {
  it('mặc định chỉ hiện bài đang dùng, kèm chống chỉ định theo tên bệnh', async () => {
    await renderScreen(<ExerciseLibraryPage />);
    expect(await screen.findByText('Squat với ghế')).toBeTruthy();
    expect(screen.queryByText('Bài cũ')).toBeNull();
    expect(await screen.findByText('Không dùng cho: Thoái hoá khớp gối')).toBeTruthy();
  });

  it('thêm bài tập: báo lỗi thiếu trường rồi gửi đúng dữ liệu', async () => {
    exercises.create.mockResolvedValue(item({ id: 9 }));
    await renderScreen(<ExerciseLibraryPage />);
    await screen.findByText('Squat với ghế');
    await fireEvent.press(screen.getByTestId('add-exercise'));
    await fireEvent.press(await screen.findByTestId('save-exercise'));
    expect(await screen.findByTestId('exercise-form-error')).toBeTruthy();
    expect(exercises.create).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId('exercise-name'), 'Đạp xe tại chỗ');
    await fireEvent.changeText(screen.getByTestId('exercise-muscle'), 'Đùi');
    await fireEvent.changeText(screen.getByTestId('exercise-instructions'), 'Đạp đều, lưng thẳng.');
    await fireEvent.press(await screen.findByText('Tăng huyết áp'));
    await fireEvent.press(screen.getByTestId('save-exercise'));
    await waitFor(() => expect(exercises.create).toHaveBeenCalledWith(expect.objectContaining({
      code: 'DAP_XE_TAI_CHO', name: 'Đạp xe tại chỗ', muscleGroup: 'Đùi', contraindicatedDiseaseCodes: 'HYPERTENSION',
    })));
  });

  it('bác sĩ cũng dùng được và lấy danh mục bệnh qua API bác sĩ', async () => {
    useUserStore.setState({ role: 'ROLE_DOCTOR', username: 'doctor01' });
    await renderScreen(<ExerciseLibraryPage />);
    expect(await screen.findByText('Squat với ghế')).toBeTruthy();
    expect(screen.getByText('KHU VỰC BÁC SĨ')).toBeTruthy();
    await waitFor(() => expect(doctorService.diseases).toHaveBeenCalled());
    expect(adminDiseaseService.list).not.toHaveBeenCalled();
  });

  it('người dùng thường không vào được', async () => {
    useUserStore.setState({ role: 'ROLE_USER' });
    await renderScreen(<ExerciseLibraryPage />);
    expect(screen.getByText('Chỉ dành cho quản trị viên và bác sĩ')).toBeTruthy();
    expect(exercises.list).not.toHaveBeenCalled();
  });
});
