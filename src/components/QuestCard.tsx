// Quest Card Component
// Displays individual quest with progress

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, Clock, Gift } from 'lucide-react';
import type { UserQuest } from '@/services/questService';
import { cn } from '@/lib/utils';

interface QuestCardProps {
  quest: UserQuest;
  onClaim?: (questId: string) => Promise<void>;
  compact?: boolean;
}

export function QuestCard({ quest, onClaim, compact = false }: QuestCardProps) {
  const [claiming, setClaiming] = useState(false);

  const progress = Math.min((quest.currentValue / quest.targetValue) * 100, 100);
  const isExpired = quest.expiresAt < Date.now();
  const timeLeft = quest.expiresAt - Date.now();

  const handleClaim = async () => {
    if (!onClaim || claiming) return;

    try {
      setClaiming(true);
      await onClaim(quest.id);
    } catch (error) {
      console.error('Error claiming quest:', error);
    } finally {
      setClaiming(false);
    }
  };

  const formatTimeLeft = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d left`;
    if (hours > 0) return `${hours}h left`;
    return 'Expires soon';
  };

  // Compact variant
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
        <span className="text-2xl">{quest.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-sm truncate">{quest.questName}</h4>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {quest.currentValue}/{quest.targetValue}
            </span>
          </div>
          <Progress value={progress} className="h-1 mt-1" />
        </div>
        {quest.completed && !quest.claimed && (
          <Button size="sm" onClick={handleClaim} disabled={claiming}>
            <Gift className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <Card
      className={cn(
        'p-4 transition-all',
        quest.completed && !quest.claimed && 'ring-2 ring-primary',
        isExpired && 'opacity-50'
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-3xl">{quest.icon}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg">{quest.questName}</h3>
              <p className="text-sm text-muted-foreground">{quest.description}</p>
            </div>
          </div>

          {/* Status Badge */}
          {quest.claimed ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-500 rounded-full text-xs">
              <Check className="w-3 h-3" />
              <span>Claimed</span>
            </div>
          ) : quest.completed ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-xs">
              <Gift className="w-3 h-3" />
              <span>Ready</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-500 rounded-full text-xs">
              <Clock className="w-3 h-3" />
              <span>{formatTimeLeft(timeLeft)}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        {!quest.claimed && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Progress: {quest.currentValue} / {quest.targetValue}
              </span>
              <span className="font-medium">{Math.floor(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎁</span>
            <div>
              <div className="text-lg font-bold text-primary">+{quest.reward} BXP</div>
              <div className="text-xs text-muted-foreground">Reward</div>
            </div>
          </div>

          {quest.completed && !quest.claimed && (
            <Button onClick={handleClaim} disabled={claiming}>
              {claiming ? 'Claiming...' : 'Claim Reward'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
