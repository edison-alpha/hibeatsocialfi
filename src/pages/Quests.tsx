import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBXP } from '@/hooks/useBXP';
import { QuestPanel } from '@/components/QuestPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Target, Zap, Star } from 'lucide-react';
import Navbar from '@/components/Navbar';

const Quests = () => {
  const { isAuthenticated } = useAuth();
  const { profile: bxpProfile, levelInfo, loading: bxpLoading } = useBXP();
  const [activeTab, setActiveTab] = useState('all');

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <Card className="max-w-md mx-auto bg-black/40 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                BXP Quests
              </CardTitle>
              <CardDescription className="text-gray-400">
                Connect your wallet to view and complete quests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">
                Please connect your wallet to access the quest system and start earning BeatsXP rewards!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-10 h-10 text-yellow-500" />
            <div>
              <h1 className="text-4xl font-bold text-white">BXP Quests</h1>
              <p className="text-gray-400 mt-1">
                Complete quests to earn BeatsXP and level up your profile
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total BXP</p>
                    <p className="text-2xl font-bold text-white">
                      {bxpLoading ? '...' : (bxpProfile?.totalXP || 0).toLocaleString()}
                    </p>
                    {levelInfo && (
                      <p className="text-xs text-gray-500">Level {levelInfo.level}</p>
                    )}
                  </div>
                  <Zap className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Active Quests</p>
                    <p className="text-2xl font-bold text-white">-</p>
                  </div>
                  <Target className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Completed</p>
                    <p className="text-2xl font-bold text-white">-</p>
                  </div>
                  <Trophy className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Streak</p>
                    <p className="text-2xl font-bold text-white">
                      {bxpLoading ? '...' : `${bxpProfile?.streak || 0} days`}
                    </p>
                  </div>
                  <Star className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quest Panel */}
        <Card className="bg-black/40 border-purple-500/30">
          <CardContent className="p-6">
            <QuestPanel />
          </CardContent>
        </Card>

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                Daily Quests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                Complete daily challenges to earn quick BXP rewards. Resets every day at midnight.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Weekly Quests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                Take on bigger challenges for larger rewards. Resets every Sunday at midnight.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-purple-500" />
                Monthly Quests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                Complete epic challenges for massive BXP rewards. Resets at the end of each month.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Quests;
