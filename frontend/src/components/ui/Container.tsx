import type { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  narrow?: boolean;
  className?: string;
}

export function Container({ children, narrow = false, className = '' }: ContainerProps) {
  const width = narrow ? 'max-w-2xl' : 'max-w-5xl';

  return <div className={`${width} mx-auto px-4 sm:px-6 ${className}`}>{children}</div>;
}
