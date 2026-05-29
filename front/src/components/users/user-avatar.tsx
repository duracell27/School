import Image from 'next/image';
import { avatarColor } from '@/lib/avatar-color';

interface UserAvatarProps {
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
  // Cloudinary: inject transformation before /upload/
  return url.replace('/upload/', `/upload/w_${size},h_${size},c_fill,f_auto/`);
}

export function UserAvatar({ name, avatar, size = 32 }: UserAvatarProps) {
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

  const color = avatarColor(name);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-medium select-none"
      style={{ ...style, fontSize: size * 0.38, backgroundColor: color.bg, color: color.text }}
    >
      {initials}
    </span>
  );
}
