'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, FileText, Clock, TrendingUp, Activity, Calendar, Download, UserCheck, MapPin, Award, Zap } from "lucide-react";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Stats {
  totalUsers: number;
  totalContributions: number;
  pendingContributions: number;
  classifiedContributions: number;
  avgProcessingTime: string;
  classificationRate: string;
  weeklyChange: number;
  newThisWeek: number;
  lastUpdated: Date | null;
}

interface AdminStats {
  totalReviews: number;
  activeReviewers: number;
  reviewsToday: number;
  avgReviewTime: string;
}

interface ReviewerData {
  id: string;
  name: string;
  email: string;
  totalReviews: number;
  reviewsThisWeek: number;
  lastActive: Date | null;
  avgReviewTime: string;
}

interface RecentActivity {
  id: string;
  adminName: string;
  adminEmail: string;
  action: string;
  contributionId: string;
  location: string;
  timestamp: Date;
}

interface LocationStat {
  location: string;
  count: number;
  latitude: number | null;
  longitude: number | null;
}

export default function AdminStatsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalContributions: 0,
    pendingContributions: 0,
    classifiedContributions: 0,
    avgProcessingTime: '0m',
    classificationRate: '0%',
    weeklyChange: 0,
    newThisWeek: 0,
    lastUpdated: null,
  });

  const [adminStats, setAdminStats] = useState<AdminStats>({
    totalReviews: 0,
    activeReviewers: 0,
    reviewsToday: 0,
    avgReviewTime: '0m',
  });

  const [reviewers, setReviewers] = useState<ReviewerData[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Fetch total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch contribution stats
      const { count: totalContributions } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true });

      const { count: pendingContributions } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: classifiedContributions } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'classified');

      // Calculate classification rate
      const classificationRate = totalContributions && totalContributions > 0
        ? Math.round((classifiedContributions || 0) / totalContributions * 100)
        : 0;

      // Get new contributions this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { count: newThisWeek } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString());

      setStats({
        totalUsers: userCount || 0,
        totalContributions: totalContributions || 0,
        pendingContributions: pendingContributions || 0,
        classifiedContributions: classifiedContributions || 0,
        avgProcessingTime: '2h 15m',
        classificationRate: `${classificationRate}%`,
        weeklyChange: 0,
        newThisWeek: newThisWeek || 0,
        lastUpdated: new Date(),
      });

      // Fetch admin activity stats
      await fetchAdminStats();
      await fetchReviewerLeaderboard();
      await fetchRecentActivity();
      await fetchLocationStats();

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      // Total reviews from review_history
      const { count: totalReviews } = await supabase
        .from('review_history')
        .select('*', { count: 'exact', head: true });

      // Active reviewers (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: activeAdmins } = await supabase
        .from('review_history')
        .select('admin_id')
        .gte('created_at', oneWeekAgo.toISOString());

      const uniqueAdmins = new Set(activeAdmins?.map(a => a.admin_id) || []);

      // Reviews today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: reviewsToday } = await supabase
        .from('review_history')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      setAdminStats({
        totalReviews: totalReviews || 0,
        activeReviewers: uniqueAdmins.size,
        reviewsToday: reviewsToday || 0,
        avgReviewTime: '15m',
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  const fetchReviewerLeaderboard = async () => {
    try {
      // Get all review history with admin details
      const { data: reviews } = await supabase
        .from('review_history')
        .select(`
          admin_id,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (!reviews) return;

      // Group by admin_id
      const adminMap = new Map<string, { count: number; lastActive: Date; weekCount: number }>();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      reviews.forEach(review => {
        const existing = adminMap.get(review.admin_id) || { count: 0, lastActive: new Date(0), weekCount: 0 };
        const reviewDate = new Date(review.created_at);

        adminMap.set(review.admin_id, {
          count: existing.count + 1,
          lastActive: reviewDate > existing.lastActive ? reviewDate : existing.lastActive,
          weekCount: reviewDate >= oneWeekAgo ? existing.weekCount + 1 : existing.weekCount,
        });
      });

      // Fetch admin details
      const adminIds = Array.from(adminMap.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', adminIds);

      // Get emails from auth.users (we'll use a placeholder for now)
      const reviewerData: ReviewerData[] = Array.from(adminMap.entries()).map(([adminId, stats]) => {
        const profile = profiles?.find(p => p.id === adminId);
        return {
          id: adminId,
          name: profile?.full_name || profile?.username || 'Unknown Admin',
          email: `admin@plasticwatch.com`, // Placeholder - would need auth.users access
          totalReviews: stats.count,
          reviewsThisWeek: stats.weekCount,
          lastActive: stats.lastActive,
          avgReviewTime: '15m', // Placeholder - would need to calculate from timestamps
        };
      });

      // Sort by total reviews
      reviewerData.sort((a, b) => b.totalReviews - a.totalReviews);
      setReviewers(reviewerData.slice(0, 10)); // Top 10
    } catch (error) {
      console.error('Error fetching reviewer leaderboard:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data: activities } = await supabase
        .from('review_history')
        .select(`
          id,
          admin_id,
          action,
          contribution_id,
          created_at,
          contributions (
            beach_name,
            latitude,
            longitude
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!activities) return;

      // Fetch admin details
      const adminIds = [...new Set(activities.map(a => a.admin_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', adminIds);

      const activityData: RecentActivity[] = activities.map(activity => {
        const profile = profiles?.find(p => p.id === activity.admin_id);
        const contribution = activity.contributions as any;

        return {
          id: activity.id,
          adminName: profile?.full_name || profile?.username || 'Unknown',
          adminEmail: 'admin@plasticwatch.com',
          action: activity.action,
          contributionId: activity.contribution_id,
          location: contribution?.beach_name || 'Unknown Location',
          timestamp: new Date(activity.created_at),
        };
      });

      setRecentActivity(activityData);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const fetchLocationStats = async () => {
    try {
      const { data: contributions } = await supabase
        .from('contributions')
        .select('beach_name, latitude, longitude')
        .eq('status', 'classified')
        .not('beach_name', 'is', null);

      if (!contributions) return;

      // Group by location
      const locationMap = new Map<string, { count: number; lat: number | null; lng: number | null }>();

      contributions.forEach(contrib => {
        const location = contrib.beach_name || 'Unknown';
        const existing = locationMap.get(location) || { count: 0, lat: contrib.latitude, lng: contrib.longitude };
        locationMap.set(location, {
          count: existing.count + 1,
          lat: existing.lat || contrib.latitude,
          lng: existing.lng || contrib.longitude,
        });
      });

      const locationData: LocationStat[] = Array.from(locationMap.entries()).map(([location, data]) => ({
        location,
        count: data.count,
        latitude: data.lat,
        longitude: data.lng,
      }));

      locationData.sort((a, b) => b.count - a.count);
      setLocationStats(locationData.slice(0, 10)); // Top 10
    } catch (error) {
      console.error('Error fetching location stats:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    fetchStats();
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      classified: { variant: 'default', label: 'Classified' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      updated: { variant: 'secondary', label: 'Updated' },
      reclassified: { variant: 'outline', label: 'Reclassified' },
    };

    const config = variants[action] || { variant: 'outline', label: action };
    return <Badge variant={config.variant as any} className="text-xs">{config.label}</Badge>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Track platform performance, admin activity, and user engagement
            {stats.lastUpdated && (
              <span className="text-xs ml-2">
                (Updated {formatDistanceToNow(stats.lastUpdated, { addSuffix: true })})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 shadow-sm hover:shadow-md transition-shadow" disabled={isLoading}>
            <Download className="h-4 w-4" />
            Export Report
          </Button>
          <Button className="gap-2 bg-primary hover:bg-blue-700 shadow-lg shadow-blue-900/20 hover:shadow-xl transition-all" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white shadow-sm border-0 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Overview</TabsTrigger>
          <TabsTrigger value="admin-activity" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Admin Activity</TabsTrigger>
          <TabsTrigger value="locations" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Locations</TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Total Contributions', value: stats.totalContributions, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'New This Week', value: `+${stats.newThisWeek}`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Classification Rate', value: stats.classificationRate, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((stat, i) => (
              <Card key={i} className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
                <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <div className={`p-2.5 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {isLoading ? (
                    <Skeleton className="h-10 w-24" />
                  ) : (
                    <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {i === 1 && `${stats.pendingContributions} pending, ${stats.classifiedContributions} classified`}
                    {i === 2 && 'New contributions in last 7 days'}
                    {i === 3 && 'Of all contributions'}
                    {i === 0 && 'Registered on platform'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Admin Activity Tab */}
        <TabsContent value="admin-activity" className="space-y-6">
          {/* Admin Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total Reviews', value: adminStats.totalReviews, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Active Reviewers', value: adminStats.activeReviewers, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Reviews Today', value: adminStats.reviewsToday, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Avg Review Time', value: adminStats.avgReviewTime, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((stat, i) => (
              <Card key={i} className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
                <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <div className={`p-2.5 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {isLoading ? (
                    <Skeleton className="h-10 w-24" />
                  ) : (
                    <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {i === 1 && 'Last 7 days'}
                    {i === 2 && 'Since midnight'}
                    {i === 3 && 'Per contribution'}
                    {i === 0 && 'All time'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Reviewer Leaderboard */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white py-5">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-lg font-bold">Reviewer Leaderboard</CardTitle>
                </div>
                <CardDescription className="mt-1">Top performing reviewers</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviewers.map((reviewer, index) => (
                      <div key={reviewer.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white text-sm font-bold shadow-md">
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{reviewer.name}</p>
                          <p className="text-xs text-muted-foreground">{reviewer.totalReviews} reviews • {reviewer.reviewsThisWeek} this week</p>
                        </div>
                        {reviewer.lastActive && (
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(reviewer.lastActive, { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white py-5">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg font-bold">Recent Activity</CardTitle>
                </div>
                <CardDescription className="mt-1">Latest review actions</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="rounded-full bg-white p-2 shadow-sm">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-foreground">{activity.adminName}</p>
                            {getActionBadge(activity.action)}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{activity.location}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white py-5">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg font-bold">Top Locations</CardTitle>
              </div>
              <CardDescription className="mt-1">Most active contribution locations</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {locationStats.map((location, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-sm font-bold shadow-md">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">{location.location}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-muted-foreground">{location.count} contributions</p>
                          {location.latitude && location.longitude && (
                            <p className="text-xs font-mono text-muted-foreground">
                              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-emerald-600">
                        {location.count}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white py-5">
              <CardTitle className="text-lg font-bold">System Performance</CardTitle>
              <CardDescription className="mt-1">Platform performance metrics and trends</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <p>Performance charts will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
