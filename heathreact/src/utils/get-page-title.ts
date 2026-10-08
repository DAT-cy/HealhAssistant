import { settings } from '@/config/settings';

const title = settings.title || 'React Native Template';

/**
 * Tạo tiêu đề cho trang dựa trên tiêu đề của trang và cấu hình.
 */
export default function getPageTitle(pageTitle?: string): string {
  if (pageTitle) return `${pageTitle}-${title}`;
  return title;
}
