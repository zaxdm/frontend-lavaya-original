// components/ui/Spinner.tsx
import { cn } from '@/lib/utils';

export default function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin', className)} />
  );
}
