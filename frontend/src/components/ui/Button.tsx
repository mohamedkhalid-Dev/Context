import { cn } from '@/lib/cn';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
};

export default function Button({ variant = 'primary', size = 'md', className, children, ...rest }: Props) {
  return (
    <button
      className={cn(
        'inline-flex min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-md font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' ? 'bg-black text-white hover:bg-gray-900 active:bg-neutral-800' : 'border border-black bg-white text-black hover:bg-gray-50 active:bg-neutral-100',
        size === 'sm' && 'min-h-[44px] px-3 py-2 text-sm',
        size === 'md' && 'min-h-[48px] px-4 py-3 text-sm sm:text-base',
        size === 'lg' && 'min-h-[52px] px-6 py-3 text-base',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
