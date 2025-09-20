import React from 'react';
import { cn } from '@/lib/utils';

interface GradientBackgroundProps {
  children: React.ReactNode;
  className?: string;
  fromColor?: string;
  toColor?: string;
  viaColor?: string;
  gradientType?: 'radial' | 'linear';
  direction?: string;
}

const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  className,
  fromColor = '#FFC160',
  toColor = '#FFFFFF',
  viaColor,
  gradientType = 'radial',
  direction = 'center'
}) => {
  return (
    <div 
      className={cn('min-h-screen w-full', className)}
      style={{ 
        backgroundColor: '#F4EDE2',
        minHeight: '100vh'
      }}
    >
      {children}
    </div>
  );
};

export default GradientBackground;
