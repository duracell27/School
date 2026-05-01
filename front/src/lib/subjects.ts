export type Subject = 'MATH' | 'UKRAINIAN';

export const SUBJECTS: { value: Subject; label: string; emoji: string }[] = [
  { value: 'MATH', label: 'Математика', emoji: '🧮' },
  { value: 'UKRAINIAN', label: 'Українська', emoji: '🇺🇦' },
];

export function subjectLabel(s: Subject): string {
  return SUBJECTS.find(x => x.value === s)?.label ?? s;
}

export function subjectEmoji(s: Subject): string {
  return SUBJECTS.find(x => x.value === s)?.emoji ?? '';
}
