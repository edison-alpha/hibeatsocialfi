// Verified Badge Component - Consistent verified icon across the app
import verifiedIcon from "@/assets/image.png";

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const VerifiedBadge = ({ size = 'md', className = '' }: VerifiedBadgeProps) => {
  return (
    <img
      src={verifiedIcon}
      alt="Verified"
      className={`${sizeClasses[size]} flex-shrink-0 ${className}`}
    />
  );
};
