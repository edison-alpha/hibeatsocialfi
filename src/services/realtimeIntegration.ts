// ✅ PRODUCTION-READY Real-Time Integration
// Combines all advanced Somnia Data Streams features into one service

import { advancedDatastreamService } from './somniaDatastreamService.advanced';
import { realtimeNotificationService } from './notificationService.realtime';
import { somniaDatastreamService } from './somniaDatastreamService';

class RealtimeIntegrationService {
  private isInitialized = false;
  private activeFeatures = {
    notifications: false,
    liveIndicators: false,
    incrementalLoading: false,
    performanceMonitoring: false
  };

  /**
   * Initialize all real-time services
   */
  async initialize(walletClient?: any): Promise<void> {
    if (this.isInitialized) {
      console.log('✅ [REALTIME] Already initialized');
      return;
    }

    try {
      console.log('🚀 [REALTIME] Initializing all real-time services...');

      // Initialize advanced datastream service
      await advancedDatastreamService.connect(walletClient);
      this.activeFeatures.liveIndicators = true;
      this.activeFeatures.incrementalLoading = true;
      this.activeFeatures.performanceMonitoring = true;
      console.log('✅ [REALTIME] Advanced datastream service initialized');

      // Initialize real-time notification service
      await realtimeNotificationService.connect(walletClient);
      this.activeFeatures.notifications = true;
      console.log('✅ [REALTIME] Real-time notification service initialized');

      // Initialize legacy datastream service (fallback)
      if (!somniaDatastreamService.isConnected()) {
        await somniaDatastreamService.connect(walletClient);
        console.log('✅ [REALTIME] Legacy datastream service initialized');
      }

      this.isInitialized = true;
      console.log('✅ [REALTIME] All services initialized successfully');
      console.log('📊 [REALTIME] Active features:', this.activeFeatures);
    } catch (error) {
      console.error('❌ [REALTIME] Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * Check if service is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get active features status
   */
  getActiveFeatures() {
    return { ...this.activeFeatures };
  }

  /**
   * Get performance metrics from all services
   */
  getPerformanceMetrics() {
    if (!this.isInitialized) {
      return {
        datastream: null,
        notifications: null,
        overall: {
          initialized: false,
          activeFeatures: 0
        }
      };
    }

    const datastreamMetrics = advancedDatastreamService.getPerformanceMetrics();
    const activeCount = Object.values(this.activeFeatures).filter(Boolean).length;

    return {
      datastream: datastreamMetrics,
      notifications: {
        service: 'realtime',
        method: 'websocket'
      },
      overall: {
        initialized: true,
        activeFeatures: activeCount,
        totalFeatures: Object.keys(this.activeFeatures).length
      }
    };
  }

  /**
   * Disconnect all services
   */
  disconnect(): void {
    if (!this.isInitialized) return;

    try {
      advancedDatastreamService.disconnect();
      realtimeNotificationService.disconnect();
      
      this.isInitialized = false;
      this.activeFeatures = {
        notifications: false,
        liveIndicators: false,
        incrementalLoading: false,
        performanceMonitoring: false
      };

      console.log('🔌 [REALTIME] All services disconnected');
    } catch (error) {
      console.error('❌ [REALTIME] Error disconnecting services:', error);
    }
  }
}

// Export singleton
export const realtimeIntegration = new RealtimeIntegrationService();
export default realtimeIntegration;
