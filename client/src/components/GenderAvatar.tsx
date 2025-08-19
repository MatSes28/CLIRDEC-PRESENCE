import { User, UserCheck } from "lucide-react";

interface GenderAvatarProps {
  gender: 'male' | 'female';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GenderAvatar({ gender, size = 'md', className = '' }: GenderAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const bgColor = gender === 'female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600';
  
  return (
    <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center ${className}`}>
      {gender === 'female' ? (
        <UserCheck className={iconSizes[size]} />
      ) : (
        <User className={iconSizes[size]} />
      )}
    </div>
  );
}