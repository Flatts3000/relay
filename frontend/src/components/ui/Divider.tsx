interface DividerProps {
  gradient?: boolean;
  className?: string;
}

export function Divider({ gradient = false, className = '' }: DividerProps) {
  const baseClass = gradient
    ? 'h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent'
    : 'h-px bg-gray-200';

  return <div className={`${baseClass} ${className}`} aria-hidden="true" />;
}
