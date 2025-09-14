import React from 'react';

interface FaviconProps {
  size?: number;
  className?: string;
}

const Favicon = ({ size = 32, className = "" }: FaviconProps) => {
  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <div 
        className="bg-primary rounded-2xl shadow-sm flex items-center justify-center"
        style={{ 
          width: size * 0.8, 
          height: size * 0.8,
          padding: size * 0.1
        }}
      >
        <img 
          src="/Diya Logo.svg" 
          alt="Diya" 
          style={{ 
            width: size * 0.6, 
            height: size * 0.6 
          }}
          className="object-contain"
        />
      </div>
    </div>
  );
};

export default Favicon;
