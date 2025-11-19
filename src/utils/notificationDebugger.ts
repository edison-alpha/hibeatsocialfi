// Notification Debugger Utility
// Import this in your component to enable detailed logging

export class NotificationDebugger {
  private static logs: Array<{timestamp: number, level: string, message: string, data?: any}> = [];
  
  static log(level: 'info' | 'success' | 'error' | 'warn', message: string, data?: any) {
    const entry = {
      timestamp: Date.now(),
      level,
      message,
      data
    };
    
    this.logs.push(entry);
    
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs.shift();
    }
    
    // Console output with emoji
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warn: '⚠️'
    };
    
    const prefix = `${emoji[level]} [NOTIF-DEBUG]`;
    
    if (level === 'error') {
      console.error(prefix, message, data || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, data || '');
    } else {
      console.log(prefix, message, data || '');
    }
  }
  
  static getLogs() {
    return this.logs;
  }
  
  static exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
  
  static clearLogs() {
    this.logs = [];
  }
  
  // Test notification system
  static async testSystem(userAddress: string) {
    this.log('info', '🔧 Starting notification system test');
    this.log('info', `Testing for user: ${userAddress}`);
    
    try {
      // Step 1: Import service
      this.log('info', 'Step 1: Importing notification service...');
      const { notificationService } = await import('@/services/notificationService');
      this.log('success', 'Service imported');
      
      // Step 2: Connect
      this.log('info', 'Step 2: Connecting service...');
      await notificationService.connect();
      this.log('success', 'Service connected');
      
      // Step 3: Check publisher
      this.log('info', 'Step 3: Checking publisher address...');
      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      if (!privateKey) {
        this.log('error', 'VITE_PRIVATE_KEY not found!');
        return { success: false, error: 'No private key' };
      }
      
      const { privateKeyToAccount } = await import('viem/accounts');
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      this.log('success', `Publisher: ${account.address}`);
      
      // Step 4: Fetch notifications
      this.log('info', 'Step 4: Fetching notifications...');
      const notifications = await notificationService.getUserNotifications(userAddress, 50, false);
      this.log('success', `Found ${notifications.length} notifications`);
      
      if (notifications.length > 0) {
        this.log('info', 'First 3 notifications:', notifications.slice(0, 3));
      } else {
        this.log('warn', 'No notifications found for this user');
      }
      
      return {
        success: true,
        notifications,
        count: notifications.length,
        publisher: account.address
      };
      
    } catch (error: any) {
      this.log('error', 'Test failed', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Expose to window for browser console
if (typeof window !== 'undefined') {
  (window as any).NotificationDebugger = NotificationDebugger;
  (window as any).testNotifications = (userAddress: string) => NotificationDebugger.testSystem(userAddress);
  console.log('💡 Notification debugger available:');
  console.log('   - window.testNotifications(userAddress)');
  console.log('   - window.NotificationDebugger.getLogs()');
  console.log('   - window.NotificationDebugger.exportLogs()');
}
