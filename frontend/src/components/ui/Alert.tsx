import { type ReactNode } from 'react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  children: ReactNode;
  className?: string;
}

export function Alert({ type, children, className = '' }: AlertProps) {
  const styles = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    info: 'bg-primary-50 text-primary-800 border-primary-200',
  };

  return (
    <div role="alert" className={`px-4 py-3 rounded-lg border ${styles[type]} ${className}`}>
      {children}
    </div>
  );
}
