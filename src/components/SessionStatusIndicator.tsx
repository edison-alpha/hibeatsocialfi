import { useSequence } from '@/contexts/SequenceContext';
import { Badge } from '@/components/ui/badge';
import { Zap, Shield } from 'lucide-react';

/**
 * Session Status Indicator
 * Hidden - Auto-approve works silently in background
 */
export const SessionStatusIndicator = () => {
  // Hidden - no need to show auto-approve status
  return null;
};

export default SessionStatusIndicator;
