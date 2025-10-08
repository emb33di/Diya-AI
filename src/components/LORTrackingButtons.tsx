import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Mail, CheckCircle } from "lucide-react";
import { LORService } from "@/services/lorService";

interface LORTrackingButtonsProps {
  recommenderId: string;
  reachedOut?: boolean;
  checkedIn?: boolean;
  submittedRecommendation?: boolean;
  internalDeadline1?: string; // When to reach out
  internalDeadline2?: string; // Check-in about progress
  internalDeadline3?: string; // When recommender should submit
  onUpdate: () => void;
}

export const LORTrackingButtons = ({
  recommenderId,
  reachedOut = false,
  checkedIn = false,
  submittedRecommendation = false,
  internalDeadline1,
  internalDeadline2,
  internalDeadline3,
  onUpdate
}: LORTrackingButtonsProps) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleTrackingUpdate = async (field: 'reachedOut' | 'checkedIn' | 'submittedRecommendation', currentValue: boolean) => {
    setLoading(field);
    try {
      await LORService.updateTrackingStatus(recommenderId, field, !currentValue);
      onUpdate();
    } catch (error) {
      console.error('Failed to update tracking status:', error);
    } finally {
      setLoading(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const trackingButtons = [
    {
      key: 'reachedOut',
      label: 'Reached out',
      icon: Mail,
      completed: reachedOut,
      plannedDate: internalDeadline1,
      loading: loading === 'reachedOut'
    },
    {
      key: 'checkedIn',
      label: 'Checked-in',
      icon: Clock,
      completed: checkedIn,
      plannedDate: internalDeadline2,
      loading: loading === 'checkedIn'
    },
    {
      key: 'submittedRecommendation',
      label: 'Submitted Recommendation',
      icon: CheckCircle,
      completed: submittedRecommendation,
      plannedDate: internalDeadline3,
      loading: loading === 'submittedRecommendation'
    }
  ];

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm">Tracking Progress:</h4>
      <div className="space-y-2">
        {trackingButtons.map((button) => {
          const Icon = button.icon;
          return (
            <div key={button.key} className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
              button.completed 
                ? 'bg-green-100 border border-green-300 hover:bg-green-200' 
                : 'bg-muted/30 hover:bg-muted/50'
            }`}>
              <div className="flex items-center space-x-3">
                <Button
                  variant={button.completed ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTrackingUpdate(button.key as any, button.completed)}
                  disabled={button.loading}
                  className={`flex items-center space-x-2 transition-all duration-200 ${
                    button.completed 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'hover:bg-muted'
                  }`}
                >
                  {button.loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : button.completed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="text-xs">{button.label}</span>
                </Button>
              </div>
              {button.plannedDate && (
                <div className="text-xs text-muted-foreground">
                  Due: {formatDate(button.plannedDate)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
