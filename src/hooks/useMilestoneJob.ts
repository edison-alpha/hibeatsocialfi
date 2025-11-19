// React Hook to manage milestone background job

import { useEffect } from 'react';
import { musicMilestoneBackgroundJob } from '@/services/musicMilestoneBackgroundJob';

export function useMilestoneJob(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    // Start job when component mounts
    console.log('🚀 Starting milestone job from hook');
    musicMilestoneBackgroundJob.start();

    // Cleanup: stop job when component unmounts
    return () => {
      console.log('🛑 Stopping milestone job from hook');
      musicMilestoneBackgroundJob.stop();
    };
  }, [enabled]);

  return {
    triggerManualCheck: () => musicMilestoneBackgroundJob.triggerManualCheck(),
    getStatus: () => musicMilestoneBackgroundJob.getStatus(),
  };
}
