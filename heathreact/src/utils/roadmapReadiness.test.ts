import { roadmapReadiness } from './roadmapReadiness';

const profile = { heightCm: 170, weightKg: 65, consent: true } as never;
const personal = { id: 3 } as never;

describe('roadmapReadiness', () => {
  it('đủ hồ sơ sức khỏe + cài đặt cá nhân → được tạo lộ trình', () => {
    expect(roadmapReadiness(profile, personal).ready).toBe(true);
  });

  it('chưa có hồ sơ / chưa cài đặt cá nhân → chặn và chỉ ra phần còn thiếu', () => {
    const result = roadmapReadiness(null, { id: null } as never);
    expect(result.ready).toBe(false);
    expect(result.missing.map((item) => item.key)).toEqual(['health', 'personal']);
  });

  it('chưa đồng ý dữ liệu → hồ sơ sức khỏe chưa xong, gợi ý bật đồng ý', () => {
    const result = roadmapReadiness({ heightCm: 170, weightKg: 65, consent: false } as never, personal);
    expect(result.ready).toBe(false);
    expect(result.missing[0].hint).toContain('Đồng ý sử dụng dữ liệu hồ sơ');
  });
});
