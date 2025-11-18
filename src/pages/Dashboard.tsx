import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Music,
  Users,
  TrendingUp,
  DollarSign,
  Play,
  Heart,
  Share2,
  Award,
  BarChart3,
  Settings,
  Edit
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { CurrentUserProfile } from "@/components/ProfileDisplay";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { userProfile } = useAuth();

  const stats = [
    {
      title: "Total Plays",
      value: "45.2K",
      change: "+12.5%",
      icon: Play,
      color: "text-green-500"
    },
    {
      title: "Followers",
      value: "2,847",
      change: "+8.2%",
      icon: Users,
      color: "text-blue-500"
    },
    {
      title: "Tips Received",
      value: "387 SOMI",
      change: "+31.7%",
      icon: DollarSign,
      color: "text-yellow-500"
    },
    {
      title: "Revenue",
      value: "1,247 SOMI",
      change: "+23.1%",
      icon: DollarSign,
      color: "text-purple-500"
    },
    {
      title: "Tracks",
      value: "24",
      change: "+2",
      icon: Music,
      color: "text-indigo-500"
    }
  ];

  const recentTracks = [
    {
      id: 1,
      title: "Cyber Dreams",
      plays: "12.5K",
      likes: 847,
      tips: "89 SOMI",
      revenue: "245 SOMI",
      cover: "/assets/album-1.jpg"
    },
    {
      id: 2,
      title: "Midnight Groove",
      plays: "8.9K",
      likes: 623,
      tips: "67 SOMI",
      revenue: "189 SOMI",
      cover: "/assets/album-2.jpg"
    },
    {
      id: 3,
      title: "Urban Pulse",
      plays: "15.2K",
      likes: 1247,
      tips: "156 SOMI",
      revenue: "312 SOMI",
      cover: "/assets/album-3.jpg"
    }
  ];

  const achievements = [
    {
      title: "First Upload",
      description: "Uploaded your first track",
      icon: Music,
      unlocked: true
    },
    {
      title: "100 Plays",
      description: "Reached 100 total plays",
      icon: Play,
      unlocked: true
    },
    {
      title: "First Tip",
      description: "Received your first tip from a fan",
      icon: DollarSign,
      unlocked: true
    },
    {
      title: "Top Artist",
      description: "Reached top 10 artists",
      icon: Award,
      unlocked: false
    },
    {
      title: "Revenue Milestone",
      description: "Earned 1000 SOMI total",
      icon: DollarSign,
      unlocked: false
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="pt-16">
        <div className="container mx-auto px-6 py-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-clash font-semibold text-4xl mb-2">Dashboard</h1>
                <p className="text-muted-foreground text-lg">Welcome back, {userProfile?.name || "Artist"}!</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <Link to="/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/create">
                    <Edit className="w-4 h-4 mr-2" />
                    Create Track
                  </Link>
                </Button>
              </div>
            </div>
          </div>



          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <p className="text-2xl font-semibold">{stat.value}</p>
                        <p className={`text-xs ${stat.color} font-medium`}>{stat.change} from last month</p>
                      </div>
                      <Icon className={`w-8 h-8 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Tracks */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Recent Tracks Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentTracks.map((track) => (
                      <div key={track.id} className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                        <img
                          src={track.cover}
                          alt={track.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold">{track.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Play className="w-3 h-3" />
                              {track.plays}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {track.likes}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {track.tips} tips
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {track.revenue}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profile & Achievements */}
            <div className="space-y-6">
              {/* Profile Card - Using integrated ProfileDisplay */}
              <CurrentUserProfile showActions={true} />

              {/* Progress Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Profile Completion</span>
                        <span>85%</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>

                    <div className="flex justify-between text-sm">
                      <span>Monthly Goal</span>
                      <span>2,000 / 2,500 SOMI</span>
                    </div>
                    <Progress value={80} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {achievements.map((achievement, index) => {
                      const Icon = achievement.icon;
                      return (
                        <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${achievement.unlocked ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'}`}>
                          <Icon className={`w-5 h-5 ${achievement.unlocked ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div className="flex-1">
                            <h4 className={`font-medium text-sm ${achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {achievement.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">{achievement.description}</p>
                          </div>
                          {achievement.unlocked && (
                            <Badge variant="secondary" className="text-xs">✓</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;