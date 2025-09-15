import React from 'react';
import { cn } from '@/lib/utils';

interface MobileResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const MobileResponsiveWrapper: React.FC<MobileResponsiveWrapperProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn(
      "w-full",
      // Mobile-first responsive design
      "px-2 sm:px-4 md:px-6 lg:px-8",
      "py-2 sm:py-4 md:py-6",
      // Ensure content doesn't overflow on small screens
      "max-w-full overflow-x-hidden",
      // Improve touch targets on mobile
      "space-y-2 sm:space-y-4 md:space-y-6",
      className
    )}>
      {children}
    </div>
  );
};

export default MobileResponsiveWrapper;
