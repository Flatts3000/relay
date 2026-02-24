import { Link } from 'react-router-dom';
import { IconCircle } from './IconCircle';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

type IconColor = 'primary' | 'gray' | 'green' | 'red' | 'amber';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: IconDefinition;
  iconColor?: IconColor;
  href?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  iconColor = 'primary',
  href,
  className = '',
}: StatCardProps) {
  const content = (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center gap-4 ${href ? 'hover:shadow-md transition-shadow' : ''} ${className}`}
    >
      <IconCircle icon={icon} size="md" color={iconColor} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}
