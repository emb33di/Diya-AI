/**
 * Escalation Count Badge
 * 
 * Displays the remaining number of expert reviews (escalations) available to the user.
 * Shows "X remaining" format for Pro users, and upgrade prompt for Free users.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, Lock } from 'lucide-react';

interface EscalationCountBadgeProps {
  used: number;
  remaining: number;
  max: number;
  canEscalate: boolean;
  isPro: boolean;
  className?: string;
}

const EscalationCountBadge: React.FC<EscalationCountBadgeProps> = ({
  used,
  remaining,
  max,
  canEscalate,
  isPro,
  className = '',
}) => {
  if (!isPro) {
    return (
      <Badge
        variant="outline"
        className={`flex items-center gap-1.5 border-amber-300 text-amber-700 bg-amber-50 ${className}`}
      >
        <Lock className="h-3 w-3" />
        <span>Pro feature</span>
      </Badge>
    );
  }

  if (remaining === 0 && used >= max) {
    return (
      <Badge
        variant="outline"
        className={`flex items-center gap-1.5 border-red-300 text-red-700 bg-red-50 ${className}`}
      >
        <span>0 remaining</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-1.5 border-blue-300 text-blue-700 bg-blue-50 ${className}`}
    >
      <Crown className="h-3 w-3" />
      <span>
        {remaining} remaining
      </span>
    </Badge>
  );
};

export default EscalationCountBadge;

