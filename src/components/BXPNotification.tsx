// BeatsXP Notification Component
// Shows XP gain notifications with animations

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { BXP_REWARDS, type BXPRewardType } from '@/config/bxpRewards';

interface XPNotification {
  id: string;
  amount: number;
  type: BXPRewardType;
  timestamp: number;
}

let notificationQueue: XPNotification[] = [];
let notificationListeners: ((notifications: XPNotification[]) => void)[] = [];

// Global function to show XP notification
export function showXPNotification(amount: number, type: BXPRewardType) {
  const notification: XPNotification = {
    id: `${Date.now()}-${Math.random()}`,
    amount,
    type,
    timestamp: Date.now(),
  };

  notificationQueue.push(notification);
  notificationListeners.forEach(listener => listener([...notificationQueue]));

  // Auto-remove after 3 seconds
  setTimeout(() => {
    notificationQueue = notificationQueue.filter(n => n.id !== notification.id);
    notificationListeners.forEach(listener => listener([...notificationQueue]));
  }, 3000);
}

export function BXPNotification() {
  const [notifications, setNotifications] = useState<XPNotification[]>([]);

  useEffect(() => {
    const listener = (newNotifications: XPNotification[]) => {
      setNotifications(newNotifications);
    };

    notificationListeners.push(listener);

    return () => {
      notificationListeners = notificationListeners.filter(l => l !== listener);
    };
  }, []);

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className="bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-white px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm pointer-events-auto"
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>
              <div>
                <div className="font-bold text-lg">+{notification.amount} BXP</div>
                <div className="text-xs opacity-90">
                  {formatRewardType(notification.type)}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function formatRewardType(type: BXPRewardType): string {
  return type
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}
