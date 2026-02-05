export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 400 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-md"
      aria-hidden="true"
    >
      {/* Connecting lines */}
      <line x1="200" y1="80" x2="120" y2="160" stroke="#bfdbfe" strokeWidth="2" />
      <line x1="200" y1="80" x2="280" y2="140" stroke="#bfdbfe" strokeWidth="2" />
      <line x1="120" y1="160" x2="80" y2="240" stroke="#93c5fd" strokeWidth="1.5" />
      <line x1="120" y1="160" x2="180" y2="240" stroke="#93c5fd" strokeWidth="1.5" />
      <line x1="280" y1="140" x2="320" y2="220" stroke="#93c5fd" strokeWidth="1.5" />
      <line x1="280" y1="140" x2="220" y2="220" stroke="#93c5fd" strokeWidth="1.5" />
      <line x1="80" y1="240" x2="180" y2="240" stroke="#bfdbfe" strokeWidth="1.5" />
      <line x1="220" y1="220" x2="320" y2="220" stroke="#bfdbfe" strokeWidth="1.5" />
      <line x1="180" y1="240" x2="220" y2="220" stroke="#dbeafe" strokeWidth="1" />

      {/* Secondary faint connections */}
      <line x1="200" y1="80" x2="220" y2="220" stroke="#dbeafe" strokeWidth="1" opacity="0.6" />
      <line x1="120" y1="160" x2="320" y2="220" stroke="#dbeafe" strokeWidth="1" opacity="0.4" />

      {/* Central hub node */}
      <circle cx="200" cy="80" r="20" fill="#2563eb" />
      <circle cx="200" cy="80" r="10" fill="#3b82f6" />

      {/* Mid-level nodes */}
      <circle cx="120" cy="160" r="14" fill="#3b82f6" />
      <circle cx="120" cy="160" r="7" fill="#60a5fa" />
      <circle cx="280" cy="140" r="14" fill="#3b82f6" />
      <circle cx="280" cy="140" r="7" fill="#60a5fa" />

      {/* Leaf nodes */}
      <circle cx="80" cy="240" r="10" fill="#60a5fa" />
      <circle cx="80" cy="240" r="5" fill="#93c5fd" />
      <circle cx="180" cy="240" r="10" fill="#60a5fa" />
      <circle cx="180" cy="240" r="5" fill="#93c5fd" />
      <circle cx="220" cy="220" r="10" fill="#60a5fa" />
      <circle cx="220" cy="220" r="5" fill="#93c5fd" />
      <circle cx="320" cy="220" r="10" fill="#60a5fa" />
      <circle cx="320" cy="220" r="5" fill="#93c5fd" />

      {/* Decorative small dots */}
      <circle cx="50" cy="120" r="3" fill="#dbeafe" />
      <circle cx="350" cy="100" r="3" fill="#dbeafe" />
      <circle cx="160" cy="280" r="3" fill="#dbeafe" />
      <circle cx="300" cy="280" r="3" fill="#dbeafe" />
      <circle cx="40" cy="200" r="2" fill="#eff6ff" />
      <circle cx="360" cy="180" r="2" fill="#eff6ff" />
    </svg>
  );
}
