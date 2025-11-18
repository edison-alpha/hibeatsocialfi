// Quest Panel Component
// Main quest interface with tabs for different quest types

import { useState } from 'react';
import { useQuests } from '@/hooks/useQuests';
import { QuestCard } from './QuestCard';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Calendar, CalendarDays, Sparkles } from 'lucide-react';
import { showXPNotification } from './BXPNotification';
import type { QuestType } from '@/config/bxpQuests';

export function QuestPanel() {
  const [activeTab, setActiveTab] = useState<QuestType>('daily');
  const { quests, stats, loading, claimReward, refresh } = useQuests(activeTab);

  const handleClaim = async (questId: string) => {
    const result = await claimReward(questId);
    
    if (result.success) {
      showXPNotification(result.reward, 'DAILY_QUEST_COMPLETE');
      await refresh();
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-64 w-full" />
      </Card>
    );
  }

  const activeQuests = quests.filter(q => !q.completed);
  const completedQuests = quests.filter(q => q.completed && !q.claimed);
  const claimedQuests = quests.filter(q => q.claimed);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-2xl font-bold">{stats.activeQuests}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-2xl font-bold">{stats.totalCompleted}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🎁</div>
            <div className="text-2xl font-bold">{stats.totalClaimed}</div>
            <div className="text-xs text-muted-foreground">Claimed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-2xl font-bold">{stats.totalRewards.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total BXP</div>
          </div>
        </div>
      </Card>

      {/* Quest Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as QuestType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Daily</span>
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">Weekly</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Monthly</span>
          </TabsTrigger>
          <TabsTrigger value="special" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Special</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {/* Ready to Claim */}
          {completedQuests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-500" />
                Ready to Claim ({completedQuests.length})
              </h3>
              <div className="grid gap-4">
                {completedQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onClaim={handleClaim}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Active Quests */}
          {activeQuests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                Active Quests ({activeQuests.length})
              </h3>
              <div className="grid gap-4">
                {activeQuests.map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
              </div>
            </div>
          )}

          {/* Claimed Quests */}
          {claimedQuests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold flex items-center gap-2 text-muted-foreground">
                <Check className="w-5 h-5" />
                Claimed ({claimedQuests.length})
              </h3>
              <div className="grid gap-4">
                {claimedQuests.map((quest) => (
                  <QuestCard key={quest.id} quest={quest} compact />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {quests.length === 0 && (
            <Card className="p-12 text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-2">No {activeTab} quests available</h3>
              <p className="text-muted-foreground">
                Check back later for new quests!
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Import missing icons
import { Target, Check, Gift } from 'lucide-react';
