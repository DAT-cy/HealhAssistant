import type { ExerciseDifficulty, ExerciseInput, ExerciseItem } from '@/api/services/exercise-admin.service';

export const DIFFICULTIES: { value: ExerciseDifficulty; label: string }[] = [
  { value: 'BEGINNER', label: 'Cơ bản' },
  { value: 'INTERMEDIATE', label: 'Trung bình' },
  { value: 'ADVANCED', label: 'Nâng cao' },
];

export const difficultyLabel = (value: string) => DIFFICULTIES.find((item) => item.value === value)?.label ?? value;

export interface ExerciseFormState {
  code: string; name: string; muscleGroup: string; difficulty: ExerciseDifficulty; equipment: string;
  sets: string; reps: string; restSeconds: string; instructions: string; commonMistakes: string;
  safetyNotes: string; contraindications: string; diseaseCodes: string[]; active: boolean;
}

export const emptyExerciseForm: ExerciseFormState = {
  code: '', name: '', muscleGroup: '', difficulty: 'BEGINNER', equipment: '', sets: '3', reps: '10-12', restSeconds: '60',
  instructions: '', commonMistakes: '', safetyNotes: '', contraindications: '', diseaseCodes: [], active: true,
};

export function formFromExercise(item: ExerciseItem): ExerciseFormState {
  return {
    code: item.code, name: item.name, muscleGroup: item.muscleGroup, difficulty: item.difficulty, equipment: item.equipment ?? '',
    sets: item.sets == null ? '' : String(item.sets), reps: item.reps ?? '', restSeconds: item.restSeconds == null ? '' : String(item.restSeconds),
    instructions: item.instructions, commonMistakes: item.commonMistakes ?? '', safetyNotes: item.safetyNotes ?? '',
    contraindications: item.contraindications ?? '', diseaseCodes: item.contraindicatedDiseaseCodes ?? [], active: item.active,
  };
}

/** Mã bài tập tự sinh từ tên: bỏ dấu, viết hoa, nối bằng "_". */
export function codeFromName(name: string) {
  return name.normalize('NFD').replace(/\p{M}+/gu, '').replace(/đ/gi, 'D').toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
}

const intOrNull = (value: string) => { const n = Number.parseInt(value.trim(), 10); return Number.isFinite(n) ? n : null; };
const textOrNull = (value: string) => (value.trim() ? value.trim() : null);

/** Kiểm tra form, trả về lỗi đầu tiên (tiếng Việt) hoặc null. */
export function validateExerciseForm(form: ExerciseFormState): string | null {
  if (!form.name.trim()) return 'Nhập tên bài tập.';
  if (!form.muscleGroup.trim()) return 'Nhập nhóm cơ.';
  if (!form.instructions.trim()) return 'Nhập hướng dẫn tư thế chuẩn.';
  if (!(form.code.trim() || codeFromName(form.name))) return 'Tên bài tập cần có chữ hoặc số để tạo mã.';
  const sets = intOrNull(form.sets);
  if (form.sets.trim() && (sets == null || sets < 1 || sets > 20)) return 'Số hiệp từ 1 đến 20.';
  const rest = intOrNull(form.restSeconds);
  if (form.restSeconds.trim() && (rest == null || rest < 0 || rest > 600)) return 'Thời gian nghỉ từ 0 đến 600 giây.';
  if (form.reps.trim().length > 40) return 'Số lần tối đa 40 ký tự.';
  return null;
}

export function toExerciseInput(form: ExerciseFormState): ExerciseInput {
  return {
    code: form.code.trim() || codeFromName(form.name),
    name: form.name.trim(), muscleGroup: form.muscleGroup.trim(), difficulty: form.difficulty,
    equipment: textOrNull(form.equipment), instructions: form.instructions.trim(), safetyNotes: textOrNull(form.safetyNotes),
    sets: intOrNull(form.sets), reps: textOrNull(form.reps), restSeconds: intOrNull(form.restSeconds),
    commonMistakes: textOrNull(form.commonMistakes), contraindications: textOrNull(form.contraindications),
    active: form.active, contraindicatedDiseaseCodes: form.diseaseCodes.join(','),
  };
}
