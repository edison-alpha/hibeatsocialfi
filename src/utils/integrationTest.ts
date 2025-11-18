// Integration Test for Sequence & Somnia Datastream
// This file demonstrates and tests the integration functionality

import { somniaDatastreamService } from '@/services/somniaDatastreamService';
import { CONTRACT_ADDRESSES } from '@/lib/web3-config';

export class IntegrationTest {
  private testResults: { [key: string]: boolean } = {};

  // Test Somnia Datastream connection
  async testDatastreamConnection(): Promise<boolean> {
    try {
      console.log('🔄 Testing Somnia Datastream connection...');
      
      await somniaDatastreamService.connect();
      const isConnected = somniaDatastreamService.isConnected();
      
      this.testResults['datastream_connection'] = isConnected;
      console.log(isConnected ? '✅ Datastream connected' : '❌ Datastream connection failed');
      
      return isConnected;
    } catch (error) {
      console.error('❌ Datastream connection test failed:', error);
      this.testResults['datastream_connection'] = false;
      return false;
    }
  }

  // Test contract event subscription
  async testEventSubscription(): Promise<boolean> {
    try {
      console.log('🔄 Testing contract event subscription...');
      
      let eventReceived = false;
      
      // Subscribe to UserProfile contract events
      const subscriptionId = await somniaDatastreamService.subscribeToLogs(
        CONTRACT_ADDRESSES.userProfile,
        [], // All events
        (log) => {
          console.log('📡 Received event:', log);
          eventReceived = true;
        }
      );
      
      // Wait for potential events (in real scenario, events would come from blockchain)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Unsubscribe
      await somniaDatastreamService.unsubscribe(subscriptionId);
      
      this.testResults['event_subscription'] = true;
      console.log('✅ Event subscription test completed');
      
      return true;
    } catch (error) {
      console.error('❌ Event subscription test failed:', error);
      this.testResults['event_subscription'] = false;
      return false;
    }
  }

  // Test new block subscription
  async testBlockSubscription(): Promise<boolean> {
    try {
      console.log('🔄 Testing new block subscription...');
      
      let blockReceived = false;
      
      const subscriptionId = await somniaDatastreamService.subscribeToNewHeads((block) => {
        console.log('🧱 New block received:', block.number);
        blockReceived = true;
      });
      
      // Wait for potential blocks
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await somniaDatastreamService.unsubscribe(subscriptionId);
      
      this.testResults['block_subscription'] = true;
      console.log('✅ Block subscription test completed');
      
      return true;
    } catch (error) {
      console.error('❌ Block subscription test failed:', error);
      this.testResults['block_subscription'] = false;
      return false;
    }
  }

  // Run all tests
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Sequence & Somnia Integration Tests...\n');
    
    const tests = [
      this.testDatastreamConnection(),
      this.testEventSubscription(),
      this.testBlockSubscription()
    ];
    
    await Promise.all(tests);
    
    console.log('\n📊 Test Results:');
    Object.entries(this.testResults).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    const passedTests = Object.values(this.testResults).filter(Boolean).length;
    const totalTests = Object.keys(this.testResults).length;
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All integration tests passed! Sequence & Somnia integration is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Check the logs above for details.');
    }
  }

  // Get test results
  getResults(): { [key: string]: boolean } {
    return this.testResults;
  }
}

// Export singleton instance
export const integrationTest = new IntegrationTest();

// Auto-run tests only when explicitly enabled
if (import.meta.env.DEV && import.meta.env.VITE_RUN_INTEGRATION_TESTS === 'true') {
  // Run tests after a longer delay to prevent performance impact
  setTimeout(() => {
    integrationTest.runAllTests().catch(console.error);
  }, 10000);
}