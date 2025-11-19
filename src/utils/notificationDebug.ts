// Debug helper for notifications
import { notificationService } from '@/services/notificationService';

export async function debugNotifications(userAddress: string) {
  console.log('🐛 [DEBUG] Starting notification debug...');
  console.log('🐛 [DEBUG] User address:', userAddress);
  
  try {
    // Try to get notifications
    const notifications = await notificationService.getUserNotifications(userAddress, 100);
    
    console.log('🐛 [DEBUG] Results:');
    console.log('  Total notifications:', notifications?.length || 0);
    
    if (notifications && notifications.length > 0) {
      console.log('  First notification:', notifications[0]);
      console.log('  Notification types:', [...new Set(notifications.map(n => n.notificationType))]);
      console.log('  From users:', [...new Set(notifications.map(n => n.fromUser))]);
      console.log('  To users:', [...new Set(notifications.map(n => n.toUser))]);
    }
    
    return notifications;
  } catch (error) {
    console.error('🐛 [DEBUG] Error:', error);
    return [];
  }
}

// Add to window for easy access in console
if (typeof window !== 'undefined') {
  (window as any).debugNotifications = debugNotifications;
  (window as any).notificationService = notificationService;
}
