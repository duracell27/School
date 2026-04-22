import Image from 'next/image';

interface ChildAvatarProps {
  name: string;
  avatar?: string | null;
  size?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toThumbUrl(url: string, size: number): string {
  return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,f_auto/`);
}

export function ChildAvatar({ name, avatar, size = 32 }: ChildAvatarProps) {
  const initials = getInitials(name);
  const style = { width: size, height: size, minWidth: size };

  if (avatar) {
    return (
      <Image
        src={toThumbUrl(avatar, size * 2)}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={style}
      />
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-medium select-none"
      style={{ ...style, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
