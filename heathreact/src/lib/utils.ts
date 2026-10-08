// Re-export cn utility — clsx + tailwind-merge pattern for RN
// In RN there is no Tailwind by default, so this is kept for compatibility.

export function cn(...inputs: any[]): string {
  return inputs.filter(Boolean).join(' ');
}
