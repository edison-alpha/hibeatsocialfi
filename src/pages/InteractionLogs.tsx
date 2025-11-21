import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navbar from '@/components/Navbar';
import { interactionLogger, InteractionLog } from '@/utils/interactionLogger';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Server,
  Download,
  Trash2,
  RefreshCw,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

const InteractionLogs = () => {
  const [logs, setLogs] = useState<InteractionLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
  const [walletFilter, setWalletFilter] = useState<'all' | 'USER' | 'SERVER'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load logs
  const loadLogs = () => {
    const allLogs = interactionLogger.getAllLogs();
    setLogs(allLogs);
    setStats(interactionLogger.getStats());
  };

  // Initial load
  useEffect(() => {
    loadLogs();
  }, []);

  // Auto refresh every 2 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadLogs();
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.status.toLowerCase() !== filter) return false;
    if (walletFilter !== 'all' && log.wallet !== walletFilter) return false;
    return true;
  });

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get wallet icon
  const getWalletIcon = (wallet: string) => {
    return wallet === 'USER' ? (
      <User className="w-4 h-4 text-blue-500" />
    ) : (
      <Server className="w-4 h-4 text-gray-500" />
    );
  };

  // Export logs
  const handleExport = () => {
    const json = interactionLogger.exportLogs();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interaction-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear logs
  const handleClear = () => {
    if (confirm('Are you sure you want to clear all logs?')) {
      interactionLogger.clearLogs();
      loadLogs();
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Format duration
  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    return `${duration}ms`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="w-8 h-8" />
              Interaction Logs
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time monitoring of all social interactions
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto' : 'Manual'}
            </Button>
            <Button variant="outline" size="sm" onClick={loadLogs}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClear}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Success</p>
                    <p className="text-2xl font-bold text-green-500">{stats.success}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Rate: {stats.successRate}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">User Wallet</p>
                    <p className="text-2xl font-bold text-blue-500">{stats.userWallet}</p>
                  </div>
                  <User className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Server: {stats.serverWallet}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-sm font-medium mb-2">Status</p>
                <div className="flex gap-2">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={filter === 'success' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('success')}
                  >
                    Success
                  </Button>
                  <Button
                    variant={filter === 'failed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('failed')}
                  >
                    Failed
                  </Button>
                  <Button
                    variant={filter === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('pending')}
                  >
                    Pending
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Wallet</p>
                <div className="flex gap-2">
                  <Button
                    variant={walletFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setWalletFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={walletFilter === 'USER' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setWalletFilter('USER')}
                  >
                    User
                  </Button>
                  <Button
                    variant={walletFilter === 'SERVER' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setWalletFilter('SERVER')}
                  >
                    Server
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Logs ({filteredLogs.length})</span>
              {autoRefresh && (
                <Badge variant="outline" className="animate-pulse">
                  Live
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No logs found</p>
                <p className="text-sm mt-2">
                  Interact with the app to see logs appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredLogs.reverse().map((log, index) => (
                  <Card key={log.timestamp} className="border-l-4" style={{
                    borderLeftColor: log.status === 'SUCCESS' ? '#22c55e' : 
                                    log.status === 'FAILED' ? '#ef4444' : '#eab308'
                  }}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Header */}
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(log.status)}
                            {getWalletIcon(log.wallet)}
                            <Badge variant="outline">{log.type}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatTime(log.timestamp)}
                            </span>
                            {log.duration && (
                              <Badge variant="secondary" className="text-xs">
                                {formatDuration(log.duration)}
                              </Badge>
                            )}
                          </div>

                          {/* Data */}
                          <div className="space-y-2 text-sm">
                            {log.data.fromUser && (
                              <div className="flex gap-2">
                                <span className="text-muted-foreground">From:</span>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {log.data.fromUser.slice(0, 10)}...{log.data.fromUser.slice(-8)}
                                </code>
                              </div>
                            )}
                            
                            {log.data.author && (
                              <div className="flex gap-2">
                                <span className="text-muted-foreground">Author:</span>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {log.data.author.slice(0, 10)}...{log.data.author.slice(-8)}
                                </code>
                              </div>
                            )}

                            {log.data.targetId && (
                              <div className="flex gap-2">
                                <span className="text-muted-foreground">Target:</span>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {log.data.targetId}
                                </code>
                              </div>
                            )}

                            {log.data.content && (
                              <div className="flex gap-2">
                                <span className="text-muted-foreground">Content:</span>
                                <span className="text-xs">
                                  {log.data.content.substring(0, 50)}
                                  {log.data.content.length > 50 && '...'}
                                </span>
                              </div>
                            )}

                            {log.data.txHash && (
                              <div className="flex gap-2">
                                <span className="text-muted-foreground">TX:</span>
                                <code className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded border border-green-500/20">
                                  {log.data.txHash.slice(0, 10)}...{log.data.txHash.slice(-8)}
                                </code>
                              </div>
                            )}

                            {log.data.publisherAddress && (
                              <div className="flex gap-2">
                                <span className="text-muted-foreground">Publisher:</span>
                                <code className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded border border-blue-500/20">
                                  {log.data.publisherAddress.slice(0, 10)}...{log.data.publisherAddress.slice(-8)}
                                </code>
                              </div>
                            )}

                            {log.error && (
                              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                  Error: {log.error.message}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Raw Data (Collapsible) */}
                          <details className="mt-3">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              View Raw Data
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(log, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Type Statistics */}
        {stats && stats.byType && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                By Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.byType).map(([type, count]: [string, any]) => (
                  count > 0 && (
                    <div key={type} className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">{type}</p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                  )
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default InteractionLogs;
