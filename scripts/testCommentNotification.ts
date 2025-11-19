// Test script untuk mengirim comment notification
import { notificationService } from '../src/services/notificationService';

async function testCommentNotification() {
  console.log('🧪 Testing Comment Notification...\n');

  try {
    // Step 1: Connect
    console.log('📋 Step 1: Connect notification service');
    await notificationService.connect();
    console.log('✅ Connected\n');

    // Step 2: Define test data
    const fromUser = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'; // Your address
    const toUser = '0x1234567890123456789012345678901234567890'; // Test recipient
    const postId = 'test_post_123';
    const comment = 'This is a test comment from script!';

    console.log('📋 Step 2: Test data');
    console.log('From:', fromUser);
    console.log('To:', toUser);
    console.log('Post ID:', postId);
    console.log('Comment:', comment);
    console.log('');

    // Step 3: Send notification
    console.log('📋 Step 3: Send comment notification');
    const success = await notificationService.notifyComment(
      fromUser,
      toUser,
      postId,
      comment
    );

    if (success) {
      console.log('✅ Comment notification sent successfully!\n');
      
      // Step 4: Verify
      console.log('📋 Step 4: Verify notification');
      console.log('Waiting 3 seconds for blockchain confirmation...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const notifications = await notificationService.getUserNotifications(toUser, 10, false);
      console.log('Found', notifications.length, 'notifications for recipient');
      
      const commentNotif = notifications.find(n => 
        n.notificationType === 'comment' && 
        n.fromUser.toLowerCase() === fromUser.toLowerCase()
      );
      
      if (commentNotif) {
        console.log('✅ Notification verified!');
        console.log('Notification details:', {
          id: commentNotif.id,
          type: commentNotif.notificationType,
          content: commentNotif.content,
          timestamp: new Date(commentNotif.timestamp).toLocaleString()
        });
      } else {
        console.log('⚠️ Notification not found yet (may need more time)');
      }
    } else {
      console.log('❌ Failed to send notification');
    }

    console.log('\n✅ Test completed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    console.error('Error:', error.message);
  }
}

// Run test
testCommentNotification();
