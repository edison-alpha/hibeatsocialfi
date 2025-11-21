// Real-Time Features Status Indicator
// Shows which real-time features are active

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, WifiOff, Zap, Activity } from 'lucide-react';
import { realtimeIntegration } from '@/services/realtimeIntegration';
import { motion, AnimatePresence } from 'framer-motion';

export function RealtimeStatusBadge() {
  const [isReady, setIsReady] = useState(false);
  const [features, setFeatures] = useState<any>(null);

  useEffect(() => {
    const checkStatus = () => {
      setIsReady(realtimeIntegration.isReady());
      setFeatures(realtimeIntegration.getActiveFeatures());
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!isReady) return null;

  const activeCount = features ? Object.values(features).filter(Boolean).length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-4 right-4 z-50"
    >
      <Badge 
        variant="default" 
        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 flex items-center gap-2 shadow-lg"
      >
        <div className="relative">
          <Wifi className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-white rounded-full animate-pulse" />
        </div>
        <span className="text-xs font-medium">
          Real-Time Active ({activeCount}/4)
        </span>
      </Badge>
    </motion.div>
  );
}

export function RealtimeStatusCard() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const updateMetrics = () => {
      const m = realtimeIntegration.getPerformanceMetrics();
      setMetrics(m);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!metrics || !metrics.overall.initialized) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <WifiOff className="h-5 w-5" />
            <span className="text-sm">Real-time features not initialized</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { datastream, overall } = metrics;

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Activity className="h-5 w-5 text-green-500" />
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <span className="font-semibold">Real-Time Status</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {overall.activeFeatures}/{overall.totalFeatures} Active
          </Badge>
        </div>

        {/* Metrics */}
        {datastream && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Response Time</p>
              <p className="text-lg font-bold text-green-500">
                {datastream.avgResponseTime.toFixed(0)}ms
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Cache Hit Rate</p>
              <p className="text-lg font-bold text-blue-500">
                {datastream.cacheHitRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Active Subs</p>
              <p className="text-lg font-bold">
                {datastream.activeSubs}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last Fetch</p>
              <p className="text-lg font-bold text-purple-500">
                {datastream.lastFetchTime}ms
              </p>
            </div>
          </div>
        )}

        {/* Performance Indicator */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-xs text-muted-foreground">
              {datastream && datastream.avgResponseTime < 200 
                ? '⚡ Ultra Fast Performance' 
                : '✅ Good Performance'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
