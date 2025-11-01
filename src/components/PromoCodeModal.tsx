import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Ticket, ArrowRight } from 'lucide-react';

interface PromoCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: (hasPromoCode: boolean) => void;
}

// Get promo code from environment variable, fallback to empty string if not set
const getValidPromoCode = (): string => {
  return import.meta.env.VITE_PROMO_CODE || '';
};

export const PromoCodeModal: React.FC<PromoCodeModalProps> = ({
  isOpen,
  onClose,
  onProceed,
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [error, setError] = useState('');

  const handleContinue = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    
    // If no promo code entered, proceed with regular price
    if (!promoCode.trim()) {
      onProceed(false);
      return;
    }

    // Validate promo code (case-insensitive)
    const validPromoCode = getValidPromoCode();
    if (!validPromoCode) {
      // If no promo code is configured, allow empty submission but reject any entered code
      if (promoCode.trim()) {
        setError('Promo codes are not currently available. Please continue without a code.');
        return;
      }
      // Allow empty submission to proceed with regular price
      onProceed(false);
      return;
    }
    const isValid = promoCode.trim().toLowerCase() === validPromoCode.toLowerCase();
    
    if (isValid) {
      // Valid promo code - proceed with promo price (EA price ID)
      onProceed(true);
    } else {
      // Invalid promo code - show error message and DON'T proceed
      // User must clear the code or remove it to continue
      setError('No promo code found.');
      // Do NOT call onProceed - keep them on the popup
    }
  };

  const handleClose = () => {
    setPromoCode('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Promo Code (Optional)
          </DialogTitle>
          <DialogDescription>
            Have a promo code? Enter it below to access special pricing, or continue without one.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleContinue} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="promo-code">Promo Code</Label>
            <Input
              id="promo-code"
              type="text"
              placeholder="Enter your promo code"
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleContinue(e);
                }
              }}
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              onClick={handleContinue}
              className="w-full"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

