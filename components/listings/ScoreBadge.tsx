import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Color coding: green for 70+, amber for 40-69, red for below 40
  const getScoreColor = () => {
    if (clampedScore >= 70) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    if (clampedScore >= 40) return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    return 'bg-red-500/20 text-red-400 border-red-500/40';
  };

  const getRingColor = () => {
    if (clampedScore >= 70) return '#10B981';
    if (clampedScore >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-lg',
  };

  const ringSize = {
    sm: { radius: 12, stroke: 2.5 },
    md: { radius: 20, stroke: 3 },
    lg: { radius: 28, stroke: 3.5 },
  };

  const { radius, stroke } = ringSize[size];
  const circumference = 2 * Math.PI * radius;
  const progress = (clampedScore / 100) * circumference;
  const svgSize = (radius + stroke) * 2;

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full border font-bold',
        getScoreColor(),
        sizeClasses[size]
      )}
      title={`Score: ${clampedScore}/100`}
    >
      {/* SVG ring progress */}
      <svg
        className="absolute inset-0"
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgSize} ${svgSize}`}
      >
        {/* Background track */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          opacity={0.15}
        />
        {/* Progress arc */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke={getRingColor()}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          transform={`rotate(-90 ${svgSize / 2} ${svgSize / 2})`}
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {/* Score number */}
      <span className="relative z-10">{clampedScore}</span>
    </div>
  );
}
