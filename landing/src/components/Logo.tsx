import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo = ({ className = "" }: LogoProps) => (
  <div className={`flex items-center justify-center ${className}`}>
    <img 
      src="/DiyaLogo.svg" 
      alt="Diya - AI College Counselor" 
      className="h-20 w-24"
    />
  </div>
);

export default Logo;
