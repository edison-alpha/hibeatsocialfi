/**
 * Activity History Component
 * 
 * Displays user's on-chain activity history in wallet sidebar
 */

import React, { useEffect, useState } from 'react';
import { somniaDatastreamServiceV3 } from '@/services/somniaDatastreamService.v3';
import { 
  ActivityHistoryData, 
  ActivityHistoryType,
  getActivityTypeLabel,
  getActivityTypeIcon,
  formatActivityTimestamp,
  groupActivitiesByDate,
  calculateActivityStats
} from '@/config/somniaDataStreams.v3';
import { useSequence } from '@/contexts/SequenceContext';
import { Loader2, Activity, TrendingUp, Calendar } from 'lucide-react';

interface ActivityHistoryProps {
  limit?: number;
  showStats?: boolean;
}

export const ActivityHistory: React.FC<ActivityHistoryProps> = ({ 
  limit = 20,
  showStats = true 
}) => {
  const { address } = useSequence();
  const [activities, setActivities] = useState<ActivityHistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    loadActivities();
  }, [address]);

  const loadActivities = async () => {
    if (!address) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await somniaDatastreamServiceV3.connect();
      const userActivities = await somniaDatastreamServiceV3.getUserActivities(address, limit);
      
      setActivities(userActivities);
    } catch (err: any) {
      console.error('Failed to load activities:', err);
      setError(err.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredActivities = () => {
    const now = Date.now();
    
    switch (selectedFilter) {
      case 'today': {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return activities.filter(a => a.timestamp >= today.getTime());
      }
      case 'week':
        return activities.filter(a => a.timestamp >= now - (7 * 24 * 60 * 60 * 1000));
      case 'month':
        return activities.filter(a => a.timestamp >= now - (30 * 24 * 60 * 60 * 1000));
      default:
        return activities;
    }
  };

  const filteredActivities = getFilteredActivities();
  const stats = calculateActivityStats(activities);
  const groupedActivities = groupActivitiesByDate(filteredActivities);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        <span className="ml-2 text-gray-400">Loading activities...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={loadActivities}
          className="mt-2 text-xs text-purple-400 hover:text-purple-300"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-center">
        <Activity className="w-8 h-8 mx-auto mb-2 text-gray-500" />
        <p className="text-gray-400 text-sm">Connect wallet to view activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {showStats && activities.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">Total</span>
            </div>
            <p className="text-lg font-bold text-white">{stats.total}</p>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Today</span>
            </div>
            <p className="text-lg font-bold text-white">{stats.today}</p>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Week</span>
            </div>
            <p className="text-lg font-bold text-white">{stats.week}</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        {(['all', 'today', 'week', 'month'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={`px-3 py-2 text-sm font-medium transition-colors ${
              selectedFilter === filter
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Activity List */}
      {filteredActivities.length === 0 ? (
        <div className="p-8 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400 text-sm">No activities yet</p>
          <p className="text-gray-500 text-xs mt-1">
            Your on-chain activities will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
          {Array.from(groupedActivities.entries()).map(([date, dateActivities]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-gray-400 mb-2 sticky top-0 bg-gray-900 py-1">
                {date}
              </h3>
              <div className="space-y-2">
                {dateActivities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={loadActivities}
        className="w-full py-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
      >
        Refresh Activities
      </button>
    </div>
  );
};

interface ActivityItemProps {
  activity: ActivityHistoryData;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const icon = getActivityTypeIcon(activity.activityType);
  const label = getActivityTypeLabel(activity.activityType);
  const timestamp = formatActivityTimestamp(activity.timestamp);

  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3 hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {activity.title}
          </p>
          {activity.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
              {activity.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">{timestamp}</span>
            {activity.txHash && (
              <a
                href={`https://explorer.somnia.network/tx/${activity.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                View TX
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityHistory;
