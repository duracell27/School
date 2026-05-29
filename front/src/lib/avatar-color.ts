const AVATAR_PALETTE: { bg: string; text: string }[] = [
  { bg: '#e0e7ff', text: '#4338ca' }, // indigo
  { bg: '#dcfce7', text: '#15803d' }, // green
  { bg: '#fee2e2', text: '#b91c1c' }, // red
  { bg: '#fef9c3', text: '#a16207' }, // yellow
  { bg: '#cffafe', text: '#0e7490' }, // cyan
  { bg: '#fce7f3', text: '#be185d' }, // pink
  { bg: '#ede9fe', text: '#6d28d9' }, // violet
  { bg: '#ffedd5', text: '#c2410c' }, // orange
  { bg: '#fce0cf', text: '#9a3412' }, // peach
];

export function avatarColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
