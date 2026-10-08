// Toàn bộ chuỗi tiếng Việt tập trung một chỗ (không hardcode trong component).
export const strings = {
  common: {
    loading: 'Đang tải...',
    retry: 'Thử lại',
    back: 'Quay lại',
    demoBadge: 'Dữ liệu demo',
    fallbackBadge: 'Kế hoạch dự phòng',
  },
  scan: {
    title: 'Quét tư thế',
    guideFront: 'Đứng thẳng người, chụp chính diện, toàn bộ cơ thể nằm trong khung hình.',
    guideSide: 'Đứng nghiêng 90 độ so với camera, toàn bộ cơ thể nằm trong khung hình.',
    lowVisibility: 'Chưa nhận được đủ điểm mốc. Hãy lùi xa và chỉnh lại góc máy.',
    unreliable: 'Độ tin cậy thấp, kết quả chỉ mang tính tham khảo.',
  },
  workout: {
    start: 'Bắt đầu',
    stop: 'Dừng bài',
    reps: 'Số lần lặp',
    feedback: {
      KNEE_VALGUS: 'Đẩy gối ra ngoài, tránh gối lệch vào trong.',
      ROUNDED_BACK: 'Giữ lưng thẳng, không cong lưng.',
      SHALLOW_DEPTH: 'Hạ sâu hơn một chút.',
      KNEES_OVER_TOES: 'Đẩy gối lùi, không cho gối vượt qua các ngón chân.',
      INSUFFICIENT_DEPTH: 'Hạ thấp hông thêm một chút nữa.',
    },
  },
  safety: {
    painTitle: 'Bạn có đang cảm thấy đau không?',
    stopNow: 'Dừng bài ngay',
    disclaimer: 'Công cụ này hỗ trợ tập luyện, không thay thế chẩn đoán hoặc điều trị y khoa.',
  },
} as const;

export const t = (path: string, fallback = ''): string => {
  const value = path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), strings);
  return typeof value === 'string' ? value : fallback;
};
