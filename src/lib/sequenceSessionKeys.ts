/**
 * Sequence Session Keys Implementation - Simplified
 * Untuk auto-approve transactions tanpa popup seperti Farcaster/Lens
 * 
 * Menggunakan wagmi + Sequence built-in session management
 */

import { ethers } from 'ethers';

export interface SessionConfig {
  expiresAt: number; // Unix timestamp
  permissions: {
    contracts: string[]; // Contract addresses yang diizinkan
    functions: string[]; // Function selectors yang diizinkan
    maxGasLimit?: string; // Store as string for localStorage compatibility
    maxValue?: string; // Store as string for localStorage compatibility
  };
}

export class SequenceSessionManager {
  private sessionConfig: SessionConfig | null = null;
  private sessionEnabled: boolean = false;

  /**
   * Enable session mode - ini akan menyimpan preference user
   */
  enableSessionMode(config: SessionConfig): void {
    try {
      this.sessionConfig = config;
      this.sessionEnabled = true;
      
      // Save to localStorage
      this.saveSessionConfig(config);
      
      console.log('✅ Session mode enabled:', {
        expiresAt: new Date(config.expiresAt * 1000).toLocaleString(),
        contracts: config.permissions.contracts.length,
        maxGasLimit: config.permissions.maxGasLimit,
        maxValue: config.permissions.maxValue
      });
    } catch (error) {
      console.error('❌ Failed to enable session mode:', error);
      throw error;
    }
  }

  /**
   * Disable session mode
   */
  disableSessionMode(): void {
    this.sessionEnabled = false;
    this.sessionConfig = null;
    this.clearSessionConfig();
    
    console.log('🔒 Session mode disabled');
  }

  /**
   * Validate if transaction can use session
   */
  canUseSession(to: string): boolean {
    if (!this.sessionEnabled || !this.sessionConfig) {
      return false;
    }

    // Check if session is expired
    if (Date.now() / 1000 > this.sessionConfig.expiresAt) {
      console.warn('⚠️ Session expired');
      this.disableSessionMode();
      return false;
    }

    // Validate transaction against session permissions
    const allowed = this.sessionConfig.permissions.contracts
      .map(c => c.toLowerCase())
      .includes(to.toLowerCase());

    if (!allowed) {
      console.warn(`⚠️ Contract ${to} not allowed in session permissions`);
    }

    return allowed;
  }

  /**
   * Check if session is active and valid
   */
  isSessionActive(): boolean {
    if (!this.sessionEnabled || !this.sessionConfig) {
      return false;
    }

    // Check expiration
    const now = Date.now() / 1000;
    const active = now < this.sessionConfig.expiresAt;

    if (!active) {
      this.disableSessionMode();
    }

    return active;
  }

  /**
   * Load session config from localStorage
   */
  loadSessionConfig(): boolean {
    try {
      const stored = localStorage.getItem('hibeats_session_config');
      if (!stored) {
        return false;
      }

      const config = JSON.parse(stored) as SessionConfig;

      // Check if expired
      if (Date.now() / 1000 > config.expiresAt) {
        this.clearSessionConfig();
        return false;
      }

      this.sessionConfig = config;
      this.sessionEnabled = true;

      console.log('✅ Session config loaded from storage');
      return true;
    } catch (error) {
      console.error('❌ Failed to load session config:', error);
      return false;
    }
  }

  /**
   * Save session config to localStorage
   */
  private saveSessionConfig(config: SessionConfig): void {
    try {
      const data = JSON.stringify(config);
      localStorage.setItem('hibeats_session_config', data);
      console.log('💾 Session config saved to localStorage');
    } catch (error) {
      console.error('❌ Failed to save session config:', error);
      throw new Error('Failed to save session configuration to browser storage');
    }
  }

  /**
   * Clear session config from localStorage
   */
  private clearSessionConfig(): void {
    localStorage.removeItem('hibeats_session_config');
  }

  /**
   * Get session expiration time
   */
  getSessionExpiration(): Date | null {
    if (!this.sessionConfig) {
      return null;
    }

    return new Date(this.sessionConfig.expiresAt * 1000);
  }

  /**
   * Get session config
   */
  getSessionConfig(): SessionConfig | null {
    return this.sessionConfig;
  }
}

// Singleton instance
export const sessionManager = new SequenceSessionManager();
