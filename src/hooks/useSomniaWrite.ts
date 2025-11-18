// Hook for writing data to Somnia Data Streams
// Uses Sequence wallet - user will see wallet pop-up for signature

import { useState, useCallback } from 'react';
import { useWalletClient, usePublicClient } from 'wagmi';
import { createSDKWithWallet, getSchemaId, SCHEMAS } from '@/lib/somniaSDK';
import { SchemaEncoder, type Hex } from '@somnia-chain/streams';
import { toHex } from 'viem';
import { waitForTransactionReceipt } from 'viem/actions';

interface WriteResult {
  success: boolean;
  txHash?: string;
  error?: string;
  writeTime: number;
}

export function useSomniaWrite() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isWriting, setIsWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Write post to Somnia Data Streams
   * User will see Sequence wallet pop-up for signature
   */
  const writePost = useCallback(
    async (content: string, metadata?: Record<string, any>): Promise<WriteResult> => {
      if (!walletClient) {
        return {
          success: false,
          error: 'Wallet not connected',
          writeTime: 0,
        };
      }

      const startTime = Date.now();
      setIsWriting(true);
      setError(null);

      try {
        console.log('📝 [DATA-STREAMS-WRITE] Writing post...');
        console.log('⚠️ User will see Sequence wallet pop-up');

        // Create SDK with user's wallet
        const sdk = createSDKWithWallet(walletClient);

        // Get schema ID
        const schemaId = await getSchemaId('posts');

        // Encode data
        const encoder = new SchemaEncoder(SCHEMAS.posts);
        const encodedData = encoder.encodeData([
          { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
          { name: 'content', value: content, type: 'string' },
          { name: 'metadata', value: JSON.stringify(metadata || {}), type: 'string' },
          { name: 'author', value: walletClient.account.address, type: 'address' },
        ]);

        // Generate unique data ID
        const dataId = toHex(`post-${Date.now()}`, { size: 32 });

        // Write to blockchain - USER WILL SEE WALLET POP-UP
        const txHash = await sdk.streams.setAndEmitEvents(
          [{ id: dataId, schemaId: schemaId as `0x${string}`, data: encodedData }],
          [
            {
              id: 'PostCreated',
              argumentTopics: [],
              data: '0x' as Hex,
            },
          ]
        );

        if (!txHash) {
          throw new Error('No transaction hash returned');
        }

        console.log('✅ Transaction sent:', txHash);
        console.log('⏳ Waiting for confirmation...');

        // Wait for confirmation
        if (publicClient) {
          await waitForTransactionReceipt(publicClient, { hash: txHash });
        }

        const writeTime = Date.now() - startTime;
        console.log(`✅ [DATA-STREAMS-WRITE] Post written in ${writeTime}ms`);

        return {
          success: true,
          txHash,
          writeTime,
        };
      } catch (err) {
        const writeTime = Date.now() - startTime;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ [DATA-STREAMS-WRITE] Error:', err);
        setError(errorMsg);

        return {
          success: false,
          error: errorMsg,
          writeTime,
        };
      } finally {
        setIsWriting(false);
      }
    },
    [walletClient, publicClient]
  );

  /**
   * Write interaction (like, comment, follow)
   */
  const writeInteraction = useCallback(
    async (
      type: 'like' | 'comment' | 'follow' | 'repost',
      targetId: string,
      content?: string
    ): Promise<WriteResult> => {
      if (!walletClient) {
        return {
          success: false,
          error: 'Wallet not connected',
          writeTime: 0,
        };
      }

      const startTime = Date.now();
      setIsWriting(true);
      setError(null);

      try {
        console.log(`👍 [DATA-STREAMS-WRITE] Writing ${type} interaction...`);

        const sdk = createSDKWithWallet(walletClient);
        const schemaId = await getSchemaId('interactions');

        const encoder = new SchemaEncoder(SCHEMAS.interactions);
        const encodedData = encoder.encodeData([
          { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
          { name: 'interactionType', value: type, type: 'string' },
          { name: 'targetId', value: targetId, type: 'string' },
          { name: 'content', value: content || '', type: 'string' },
          { name: 'fromUser', value: walletClient.account.address, type: 'address' },
        ]);

        const dataId = toHex(`${type}-${targetId}-${Date.now()}`, { size: 32 });

        // USER WILL SEE WALLET POP-UP
        const txHash = await sdk.streams.setAndEmitEvents(
          [{ id: dataId, schemaId: schemaId as `0x${string}`, data: encodedData }],
          [
            {
              id: `Interaction${type.charAt(0).toUpperCase() + type.slice(1)}`,
              argumentTopics: [],
              data: '0x' as Hex,
            },
          ]
        );

        if (!txHash) {
          throw new Error('No transaction hash returned');
        }

        if (publicClient) {
          await waitForTransactionReceipt(publicClient, { hash: txHash });
        }

        const writeTime = Date.now() - startTime;
        console.log(`✅ [DATA-STREAMS-WRITE] ${type} written in ${writeTime}ms`);

        return {
          success: true,
          txHash,
          writeTime,
        };
      } catch (err) {
        const writeTime = Date.now() - startTime;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ [DATA-STREAMS-WRITE] Error:', err);
        setError(errorMsg);

        return {
          success: false,
          error: errorMsg,
          writeTime,
        };
      } finally {
        setIsWriting(false);
      }
    },
    [walletClient, publicClient]
  );

  /**
   * Follow a user
   */
  const followUser = useCallback(
    async (targetAddress: string): Promise<WriteResult> => {
      if (!walletClient) {
        return {
          success: false,
          error: 'Wallet not connected',
          writeTime: 0,
        };
      }

      const startTime = Date.now();
      setIsWriting(true);
      setError(null);

      try {
        console.log('👥 [DATA-STREAMS-WRITE] Following user...');

        const sdk = createSDKWithWallet(walletClient);
        const schemaId = await getSchemaId('follows');

        const encoder = new SchemaEncoder(SCHEMAS.follows);
        const encodedData = encoder.encodeData([
          { name: 'follower', value: walletClient.account.address, type: 'address' },
          { name: 'following', value: targetAddress, type: 'address' },
          { name: 'isFollowing', value: 'true', type: 'bool' },
          { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
        ]);

        const dataId = toHex(`follow_${walletClient.account.address}_${targetAddress}`, { size: 32 });

        const txHash = await sdk.streams.setAndEmitEvents(
          [{ id: dataId, schemaId: schemaId as `0x${string}`, data: encodedData }],
          [
            {
              id: 'UserFollowed',
              argumentTopics: [],
              data: '0x' as Hex,
            },
          ]
        );

        if (!txHash) {
          throw new Error('No transaction hash returned');
        }

        if (publicClient) {
          await waitForTransactionReceipt(publicClient, { hash: txHash });
        }

        const writeTime = Date.now() - startTime;
        console.log(`✅ [DATA-STREAMS-WRITE] Follow written in ${writeTime}ms`);

        return {
          success: true,
          txHash,
          writeTime,
        };
      } catch (err) {
        const writeTime = Date.now() - startTime;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ [DATA-STREAMS-WRITE] Error:', err);
        setError(errorMsg);

        return {
          success: false,
          error: errorMsg,
          writeTime,
        };
      } finally {
        setIsWriting(false);
      }
    },
    [walletClient, publicClient]
  );

  /**
   * Unfollow a user
   */
  const unfollowUser = useCallback(
    async (targetAddress: string): Promise<WriteResult> => {
      if (!walletClient) {
        return {
          success: false,
          error: 'Wallet not connected',
          writeTime: 0,
        };
      }

      const startTime = Date.now();
      setIsWriting(true);
      setError(null);

      try {
        console.log('👥 [DATA-STREAMS-WRITE] Unfollowing user...');

        const sdk = createSDKWithWallet(walletClient);
        const schemaId = await getSchemaId('follows');

        const encoder = new SchemaEncoder(SCHEMAS.follows);
        const encodedData = encoder.encodeData([
          { name: 'follower', value: walletClient.account.address, type: 'address' },
          { name: 'following', value: targetAddress, type: 'address' },
          { name: 'isFollowing', value: 'false', type: 'bool' },
          { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
        ]);

        const dataId = toHex(`follow_${walletClient.account.address}_${targetAddress}`, { size: 32 });

        const txHash = await sdk.streams.setAndEmitEvents(
          [{ id: dataId, schemaId: schemaId as `0x${string}`, data: encodedData }],
          [
            {
              id: 'UserUnfollowed',
              argumentTopics: [],
              data: '0x' as Hex,
            },
          ]
        );

        if (!txHash) {
          throw new Error('No transaction hash returned');
        }

        if (publicClient) {
          await waitForTransactionReceipt(publicClient, { hash: txHash });
        }

        const writeTime = Date.now() - startTime;
        console.log(`✅ [DATA-STREAMS-WRITE] Unfollow written in ${writeTime}ms`);

        return {
          success: true,
          txHash,
          writeTime,
        };
      } catch (err) {
        const writeTime = Date.now() - startTime;
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ [DATA-STREAMS-WRITE] Error:', err);
        setError(errorMsg);

        return {
          success: false,
          error: errorMsg,
          writeTime,
        };
      } finally {
        setIsWriting(false);
      }
    },
    [walletClient, publicClient]
  );

  return {
    writePost,
    writeInteraction,
    followUser,
    unfollowUser,
    isWriting,
    error,
    clearError: () => setError(null),
  };
}

export type { WriteResult };
