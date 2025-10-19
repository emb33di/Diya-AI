import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface RazorpayButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const RazorpayButton: React.FC<RazorpayButtonProps> = ({
  onClick,
  loading = false,
  disabled = false,
  className = "",
  children
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative overflow-hidden bg-gradient-to-r from-[#3395FF] to-[#2B7CE9] hover:from-[#2B7CE9] hover:to-[#1E5BB8] text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] group ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <div className="flex items-center justify-center">
          {/* Razorpay Logo */}
          <svg
            className="h-5 w-5 mr-2"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Razorpay "R" logo - simplified version */}
            <path
              d="M8 4h6c2.2 0 4 1.8 4 4s-1.8 4-4 4h-2v4H8V4zm2 6h4c1.1 0 2-.9 2-2s-.9-2-2-2h-4v4z"
              fill="currentColor"
            />
          </svg>
          
          {/* Button Text */}
          {children || <span className="font-semibold">Pay with Razorpay</span>}
        </div>
      )}
      
      {/* Subtle shine effect */}
      <div className="absolute inset-0 -top-1 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
    </Button>
  );
};

export default RazorpayButton;
