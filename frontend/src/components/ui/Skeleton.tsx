type SkeletonVariant = 'text' | 'circle' | 'rect';

interface SkeletonProps {
  className?: string;
  variant?: SkeletonVariant;
}

const variantClasses: Record<SkeletonVariant, string> = {
  text: 'h-4 rounded',
  circle: 'rounded-full',
  rect: 'rounded-lg',
};

export function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 ${variantClasses[variant]} ${className}`}
      aria-hidden="true"
    />
  );
}
