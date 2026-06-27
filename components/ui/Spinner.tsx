// components/ui/Spinner.tsx
import { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  className?: string;
  style?: CSSProperties;
}

export default function Spinner({ className, style }: SpinnerProps) {
  return (
    <div
      className={cn('w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin', className)}
      style={style}
    />
  );
}