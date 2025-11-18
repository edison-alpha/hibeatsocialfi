// Event decoder untuk Somnia DataStream
import { decodeEventLog, parseAbi } from 'viem';
import { USER_PROFILE_ABI } from '@/lib/abis/UserProfile';

// Event signatures untuk profile events
export const PROFILE_EVENT_SIGNATURES = {
  ProfileCreated: '0x' + 'ProfileCreated(address,string)'.padEnd(64, '0'),
  ProfileUpdated: '0x' + 'ProfileUpdated(address)'.padEnd(64, '0')
};

// Decode ProfileCreated event
export function decodeProfileCreatedEvent(log: any): any {
  try {
    // ProfileCreated(address indexed user, string username)
    const decoded = decodeEventLog({
      abi: USER_PROFILE_ABI,
      data: log.data,
      topics: log.topics,
    });

    if (decoded.eventName === 'ProfileCreated') {
      return {
        eventType: 'ProfileCreated',
        userAddress: decoded.args.user,
        username: decoded.args.username,
        blockNumber: parseInt(log.blockNumber, 16),
        transactionHash: log.transactionHash,
        timestamp: Date.now() // In production, get from block timestamp
      };
    }

    return null;
  } catch (error) {
    console.error('Error decoding ProfileCreated event:', error);
    return null;
  }
}

// Decode ProfileUpdated event
export function decodeProfileUpdatedEvent(log: any): any {
  try {
    // ProfileUpdated(address indexed user)
    const decoded = decodeEventLog({
      abi: USER_PROFILE_ABI,
      data: log.data,
      topics: log.topics,
    });

    if (decoded.eventName === 'ProfileUpdated') {
      return {
        eventType: 'ProfileUpdated',
        userAddress: decoded.args.user,
        blockNumber: parseInt(log.blockNumber, 16),
        transactionHash: log.transactionHash,
        timestamp: Date.now()
      };
    }

    return null;
  } catch (error) {
    console.error('Error decoding ProfileUpdated event:', error);
    return null;
  }
}

// Decode any profile event
export function decodeProfileEvent(log: any): any {
  try {
    const eventSignature = log.topics[0];

    if (eventSignature === PROFILE_EVENT_SIGNATURES.ProfileCreated) {
      return decodeProfileCreatedEvent(log);
    }

    if (eventSignature === PROFILE_EVENT_SIGNATURES.ProfileUpdated) {
      return decodeProfileUpdatedEvent(log);
    }

    console.warn('Unknown profile event signature:', eventSignature);
    return null;
  } catch (error) {
    console.error('Error decoding profile event:', error);
    return null;
  }
}