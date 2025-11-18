/**
 * ONE-CLICK AUTO-APPROVE SESSION MANAGER
 * 
 * Method 1: Sign message once, auto-approve all transactions
 * 
 * HOW IT WORKS:
 * 1. User clicks "Enable Auto-Approve"
 * 2. Wallet popup muncul SEKALI untuk sign message
 * 3. User approve message
 * 4. Session saved to localStorage
 * 5. All subsequent transactions = NO POPUP! (within session duration)
 * 
 * SECURITY:
 * - Session expires after specified duration (default 24 hours)
 * - Session tied to specific wallet address
 * - Can be manually closed anytime
 * - Stored only in browser localStorage (cleared on logout)
 */

import { WalletClient } from 'viem';

export interface SessionData {
  signature: string;
  address: string;
  expiry: number;
  createdAt: number;
  message: string;
}

const SESSION_STORAGE_KEY = 'hibeats_auto_approve_session';

/**
 * Create auto-approve session
 * User approves ONCE, then all transactions auto-approved
 */
export async function createAutoApproveSession(
  walletClient: WalletClient,
  address: string,
  duration: number = 86400 // 24 hours default
): Promise<string> {
  console.log('🔑 Creating one-click auto-approve session...');
  console.log('💡 User will approve ONCE, then all transactions automatic!');

  // Create message for user to sign
  const expiryDate = new Date(Date.now() + duration * 1000);
  const message = `🔐 Enable Auto-Approve for HiBeats

Duration: ${Math.floor(duration / 3600)} hours
Expires: ${expiryDate.toLocaleString()}

Benefits:
✅ No popups for posts, likes, comments
✅ Instant transactions (1-2 seconds)  
✅ 100% gasless (free forever)
✅ Secure with automatic expiration

By signing this message, you allow this app to send gasless transactions on your behalf within the specified time period.

Session ID: ${Date.now()}
Address: ${address}`;

  console.log('📱 Requesting signature from wallet (ONLY POPUP!)...');

  try {
    // THIS IS THE ONLY POPUP USER WILL SEE!
    const signature = await walletClient.signMessage({
      message,
      account: address as `0x${string}`
    });

    // Save session to localStorage
    const sessionData: SessionData = {
      signature,
      address,
      expiry: Date.now() + duration * 1000,
      createdAt: Date.now(),
      message
    };

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));

    console.log('✅ Session created successfully!');
    console.log('💡 Expires:', expiryDate.toLocaleString());
    console.log('🎉 NO MORE POPUPS for transactions!');

    return signature;
  } catch (error: any) {
    console.error('❌ Failed to create session:', error);

    // Handle user rejection
    if (
      error.code === 4001 ||
      error.message?.includes('User rejected') ||
      error.message?.includes('rejected') ||
      error.message?.includes('denied')
    ) {
      throw new Error('USER_REJECTED');
    }

    throw error;
  }
}

/**
 * Close and clear session
 */
export function closeAutoApproveSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  console.log('🔒 Auto-approve session closed');
}

/**
 * Check if session is active and valid
 */
export function getActiveSession(currentAddress: string): SessionData | null {
  try {
    const sessionStr = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionStr) return null;

    const session: SessionData = JSON.parse(sessionStr);

    // Verify session is valid
    if (session.expiry > Date.now() && session.address === currentAddress) {
      console.log('✅ Active session found');
      console.log('⏰ Expires:', new Date(session.expiry).toLocaleString());
      return session;
    }

    // Session invalid - clear it
    localStorage.removeItem(SESSION_STORAGE_KEY);
    console.log('⏰ Session expired or address mismatch');
    return null;
  } catch (error) {
    console.error('Failed to get session:', error);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

/**
 * Check if session is active (boolean)
 */
export function isSessionActive(currentAddress: string): boolean {
  return getActiveSession(currentAddress) !== null;
}

/**
 * Get session time remaining in milliseconds
 */
export function getSessionTimeRemaining(currentAddress: string): number {
  const session = getActiveSession(currentAddress);
  if (!session) return 0;

  return Math.max(0, session.expiry - Date.now());
}

/**
 * Get session time remaining in human readable format
 */
export function getSessionTimeRemainingFormatted(currentAddress: string): string {
  const remaining = getSessionTimeRemaining(currentAddress);
  if (remaining === 0) return 'Expired';

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}
