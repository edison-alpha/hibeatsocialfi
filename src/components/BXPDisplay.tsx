// BeatsXP Display Component
// Shows user's XP, level, and progress

import { useBXP } from '@/hooks/useBXP';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, TrendingUp, Zap } from 'lucide-react';

interface BXPDisplayProps {
  variant?: 'full' | 'compact' | 'minimal';
  showProgress?: boolean;
  showStreak?: boolean;
}

export function BXPDisplay({ 
  variant = 'full', 
  showProgress = true,
  showStreak = true 
}: BXPDisplayProps) {
  const { profile, levelInfo, loading } = useBXP();

  if (loading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-20 w-full" />
      </Card>
    );
  }

  if (!profile || !levelInfo) {
    return null;
  }

  // Minimal variant - just badge and level
  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-2xl">{levelInfo.badge}</span>
        <div className="text-sm">
          <div className="font-bold">Level {levelInfo.level}</div>
          <div className="text-xs text-muted-foreground">{profile.totalXP.toLocaleString()} BXP</div>
        </div>
      </div>
    );
  }

  // Compact variant - single line
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-2 bg-secondary/50 rounded-lg">
        <span className="text-xl">{levelInfo.badge}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Level {levelInfo.level} - {levelInfo.title}</span>
            <span className="text-muted-foreground">{profile.totalXP.toLocaleString()} BXP</span>
          </div>
          {showProgress && (
            <Progress value={levelInfo.progress} className="h-1 mt-1" />
          )}
        </div>
      </div>
    );
  }

  // Full variant - detailed card
  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{levelInfo.badge}</div>
            <div>
              <h3 className="text-2xl font-bold">Level {levelInfo.level}</h3>
              <p className="text-sm text-muted-foreground">{levelInfo.title}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {profile.totalXP.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total BXP</div>
          </div>
        </div>

        {/* Progress Bar */}
        {showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {levelInfo.currentLevelXP.toLocaleString()} / {levelInfo.nextLevelXP.toLocaleString()} XP
              </span>
              <span className="font-medium">{Math.floor(levelInfo.progress)}%</span>
            </div>
            <Progress value={levelInfo.progress} className="h-2" />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold">{profile.rank || '-'}</div>
            <div className="text-xs text-muted-foreground">Rank</div>
          </div>

          {showStreak && (
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold">{profile.streak}</div>
              <div className="text-xs text-muted-foreground">Day Streak</div>
            </div>
          )}

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-lg font-bold">{profile.dailyXP}</div>
            <div className="text-xs text-muted-foreground">Today</div>
          </div>
        </div>

        {/* Multipliers */}
        {profile.multipliers.length > 0 && (
          <div className="pt-4 border-t">
            <div className="text-xs text-muted-foreground mb-2">Active Multipliers</div>
            <div className="flex flex-wrap gap-2">
              {profile.multipliers.map((multiplier) => (
                <span
                  key={multiplier}
                  className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                >
                  {multiplier.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
