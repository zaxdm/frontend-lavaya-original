// components/ui/Badge.tsx
import { cn } from '@/lib/utils';

interface BadgeProps {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export default function Badge({ className, children, style }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', className)}
      style={style}
    >
      {children}
    </span>
  );
}