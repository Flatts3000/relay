import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

type IconCircleSize = 'sm' | 'md' | 'lg';
type IconCircleColor = 'primary' | 'gray' | 'green' | 'red' | 'amber';

interface IconCircleProps {
  icon: IconDefinition;
  size?: IconCircleSize;
  color?: IconCircleColor;
  className?: string;
}

const sizes: Record<IconCircleSize, { container: string; icon: string }> = {
  sm: { container: 'w-8 h-8', icon: 'text-sm' },
  md: { container: 'w-14 h-14', icon: 'text-xl' },
  lg: { container: 'w-16 h-16', icon: 'text-2xl' },
};

const colors: Record<IconCircleColor, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary-100', text: 'text-primary-600' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-700' },
  green: { bg: 'bg-green-100', text: 'text-green-600' },
  red: { bg: 'bg-red-100', text: 'text-red-600' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
};

export function IconCircle({
  icon,
  size = 'md',
  color = 'primary',
  className = '',
}: IconCircleProps) {
  const s = sizes[size];
  const c = colors[color];

  return (
    <div
      className={`${s.container} rounded-2xl ${c.bg} flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <FontAwesomeIcon icon={icon} className={`${s.icon} ${c.text}`} />
    </div>
  );
}
