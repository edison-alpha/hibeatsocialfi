// Real-Time Metrics Dashboard - Menampilkan TPS dan performance metrics
// Optimized untuk Somnia 1M TPS monitoring

import { useEffect, useState } from 'react';
import { useTransactionMetrics } from '@/hooks/useRealtimeTransaction';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Zap, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function RealtimeMetricsDashboard() {
  const { metrics, queueStats } = useTransactionMetrics();
  const [tpsHistory, setTpsHistory] = useState<number[]>([]);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  // Update TPS history for visualization
  useEffect(() => {
    setTpsHistory(prev => {
      const newHistory = [...prev, metrics.currentTPS];
      return newHistory.slice(-60); // Keep last 60 data points (1 minute at 1Hz)
    });

    setLatencyHistory(prev => {
      const newHistory = [...prev, metrics.averageLatency];
      return newHistory.slice(-60);
    });
  }, [metrics.currentTPS, metrics.averageLatency]);

  // Calculate success rate
  const successRate = metrics.totalTransactions > 0
    ? (metrics.successfulTransactions / metrics.totalTransactions) * 100
    : 0;

  // Get TPS status color
  const getTpsStatusColor = (tps: number) => {
    if (tps >= 1000) return 'text-green-500';
    if (tps >= 500) return 'text-blue-500';
    if (tps >= 100) return 'text-yellow-500';
    return 'text-gray-500';
  };

  // Get latency status
  const getLatencyStatus = (latency: number) => {
    if (latency < 100) return { text: 'Excellent', color: 'text-green-500' };
    if (latency < 500) return { text: 'Good', color: 'text-blue-500' };
    if (latency < 1000) return { text: 'Fair', color: 'text-yellow-500' };
    return { text: 'Poor', color: 'text-red-500' };
  };

  const latencyStatus = getLatencyStatus(metrics.averageLatency);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-clash flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            Real-Time Performance
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Live transaction metrics powered by Somnia 1M TPS blockchain
          </p>
        </div>
        <Badge variant="outline" className="text-sm h-8 px-3 font-clash">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
          Somnia Network
        </Badge>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current TPS */}
        <Card className="border-border/50 bg-card/95 backdrop-blur hover:border-primary/50 transition-all group">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-muted-foreground">
              <Zap className="w-4 h-4 text-primary" />
              Current TPS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold font-clash ${getTpsStatusColor(metrics.currentTPS)} transition-colors`}>
              {metrics.currentTPS.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
              <span>Peak: {metrics.peakTPS.toLocaleString()}</span>
              <Badge variant="outline" className="text-[10px] h-5">
                Target: 1M
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Average Latency */}
        <Card className="border-border/50 bg-card/95 backdrop-blur hover:border-blue-500/50 transition-all group">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 text-blue-500" />
              Avg Latency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold font-clash ${latencyStatus.color} transition-colors`}>
              {metrics.averageLatency.toFixed(0)}ms
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
              <span>Status: {latencyStatus.text}</span>
              {metrics.averageLatency < 1000 && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-500">Sub-sec</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="border-border/50 bg-card/95 backdrop-blur hover:border-green-500/50 transition-all group">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Success Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-clash text-green-500">
              {successRate.toFixed(1)}%
            </div>
            <div className="mt-2">
              <Progress 
                value={successRate} 
                className="h-1.5 bg-muted/50" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Total Transactions */}
        <Card className="border-border/50 bg-card/95 backdrop-blur hover:border-purple-500/50 transition-all group">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-muted-foreground">
              <Activity className="w-4 h-4 text-purple-500" />
              Total Transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-clash">
              {metrics.totalTransactions.toLocaleString()}
            </div>
            <div className="flex items-center gap-3 text-xs mt-1">
              <div className="flex items-center gap-1.5 text-green-500">
                <CheckCircle className="w-3 h-3" />
                <span>{metrics.successfulTransactions}</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-500">
                <XCircle className="w-3 h-3" />
                <span>{metrics.failedTransactions}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Status */}
      <Card className="border-border/50 bg-card/95 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg font-clash">Transaction Queue</CardTitle>
          <CardDescription>Current queue status by priority level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* High Priority */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10 hover:border-red-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <Badge variant="destructive" className="text-xs mb-1">High Priority</Badge>
                  <p className="text-xs text-muted-foreground">Urgent transactions</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-clash">{queueStats.high}</div>
                <div className="text-xs text-muted-foreground">in queue</div>
              </div>
            </div>

            {/* Medium Priority */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <Badge className="text-xs mb-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30">Medium Priority</Badge>
                  <p className="text-xs text-muted-foreground">Standard transactions</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-clash">{queueStats.medium}</div>
                <div className="text-xs text-muted-foreground">in queue</div>
              </div>
            </div>

            {/* Low Priority */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-border transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <Badge variant="secondary" className="text-xs mb-1">Low Priority</Badge>
                  <p className="text-xs text-muted-foreground">Background tasks</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-clash">{queueStats.low}</div>
                <div className="text-xs text-muted-foreground">in queue</div>
              </div>
            </div>

            {/* Pending */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
                <div>
                  <Badge variant="outline" className="text-xs mb-1">Processing</Badge>
                  <p className="text-xs text-muted-foreground">Currently executing</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-clash text-primary">{queueStats.pending}</div>
                <div className="text-xs text-muted-foreground">active</div>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <span className="font-semibold">Total in Queue</span>
              <span className="text-2xl font-bold font-clash">{queueStats.total}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TPS Visualization (Simple text-based for now) */}
      <Card className="border-border/50 bg-card/95 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg font-clash">TPS History</CardTitle>
          <CardDescription>Transaction throughput over the last 60 seconds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative h-24 flex items-end gap-0.5 px-2">
            {tpsHistory.map((tps, index) => {
              const height = Math.min((tps / (metrics.peakTPS || 1)) * 100, 100);
              const isRecent = index >= tpsHistory.length - 10;
              return (
                <div
                  key={index}
                  className={`flex-1 rounded-t transition-all duration-300 ${
                    isRecent 
                      ? 'bg-gradient-to-t from-primary to-primary/60' 
                      : 'bg-gradient-to-t from-primary/60 to-primary/30'
                  } hover:from-primary hover:to-primary/80 cursor-pointer group relative`}
                  style={{ height: `${height}%`, minHeight: '2px' }}
                  title={`${tps} TPS`}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border border-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {tps} TPS
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-3 text-xs text-muted-foreground px-2">
            <span>-60s</span>
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Now
            </span>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border/50 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-t from-primary to-primary/60" />
              <span className="text-muted-foreground">Recent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-t from-primary/60 to-primary/30" />
              <span className="text-muted-foreground">Historical</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Indicators */}
      <Card className="border-border/50 bg-card/95 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg font-clash">Performance Indicators</CardTitle>
          <CardDescription>Real-time system health metrics powered by Somnia</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sub-second Finality */}
            <div className="group relative overflow-hidden rounded-lg border border-border/40 bg-gradient-to-br from-green-500/10 via-background to-background p-4 transition-all hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-start gap-3">
                <div className="rounded-full bg-green-500/10 p-2.5 ring-1 ring-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1">Sub-second Finality</div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={metrics.averageLatency < 1000 ? "default" : "secondary"}
                      className={metrics.averageLatency < 1000 ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" : ""}
                    >
                      {metrics.averageLatency < 1000 ? '✓ Active' : 'Inactive'}
                    </Badge>
                    {metrics.averageLatency < 1000 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        {metrics.averageLatency.toFixed(0)}ms
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* High Throughput */}
            <div className="group relative overflow-hidden rounded-lg border border-border/40 bg-gradient-to-br from-blue-500/10 via-background to-background p-4 transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-start gap-3">
                <div className="rounded-full bg-blue-500/10 p-2.5 ring-1 ring-blue-500/20">
                  <Zap className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1">High Throughput</div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={metrics.currentTPS > 100 ? "default" : "secondary"}
                      className={metrics.currentTPS > 100 ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30" : ""}
                    >
                      {metrics.currentTPS > 100 ? '✓ Active' : 'Idle'}
                    </Badge>
                    {metrics.currentTPS > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="w-3 h-3" />
                        {metrics.currentTPS} TPS
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Reliable Processing */}
            <div className="group relative overflow-hidden rounded-lg border border-border/40 bg-gradient-to-br from-purple-500/10 via-background to-background p-4 transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-start gap-3">
                <div className="rounded-full bg-purple-500/10 p-2.5 ring-1 ring-purple-500/20">
                  <Activity className="w-5 h-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1">Reliable Processing</div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="default"
                      className="bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30"
                    >
                      {successRate > 95 ? '✓ Excellent' : successRate > 80 ? '✓ Good' : 'Fair'}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {successRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Status Summary */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>System Operational</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  Uptime: <span className="text-foreground font-medium">99.9%</span>
                </span>
                <span className="text-muted-foreground">
                  Network: <span className="text-foreground font-medium">Somnia Testnet</span>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
