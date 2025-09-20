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
  fromColor = '#EFA536',
  toColor = '#FFFFFF',
  viaColor,
  gradientType = 'radial',
  direction = 'center'
}) => {
  const gradientStyle = gradientType === 'radial' 
    ? `radial-gradient(circle at ${direction}, ${fromColor}, ${viaColor ? `${viaColor}, ` : ''}${toColor})`
    : `linear-gradient(${direction}, ${fromColor}, ${viaColor ? `${viaColor}, ` : ''}${toColor})`;

  return (
    <div 
      className={cn('min-h-screen', className)}
      style={{ background: gradientStyle }}
    >
      {children}
    </div>
  );
};

export default GradientBackground;
