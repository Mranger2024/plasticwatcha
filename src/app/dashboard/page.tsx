'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  CheckCircle,
  Clock,
  TrendingUp,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  MapPin,
  Activity,
  ShieldCheck
} from "lucide-react";
import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase/client";
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface Contribution {
  id: string;
  brand_suggestion: string | null;
  beach_name: string | null;
  created_at: string;
  status: string;
  product_image_url?: string;
}

type Stats = {
  pending: number;
  classified: number;
  newToday: number;
  classificationRate: number;
};

export default function DashboardPage() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    classified: 0,
    newToday: 0,
    classificationRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch contributions
      const { data: contribs } = await supabase
        .from('contributions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (contribs) {
        setContributions(contribs || []);

        // Calculate stats
        const pending = contribs.filter(c => c.status === 'pending').length;
        const classified = contribs.filter(c => c.status === 'classified').length;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newToday = contribs.filter(c => new Date(c.created_at) >= today).length;
        const rate = contribs.length > 0 ? (classified / contribs.length) * 100 : 0;

        setStats({
          pending,
          classified,
          newToday,
          classificationRate: Math.round(rate * 10) / 10
        });
      }
      setLoading(false);

      // Fetch recent admin activity
      fetchRecentActivity();
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      setIsLoadingActivity(true);
      const { data: activities } = await supabase
        .from('review_history')
        .select(`
          id,
          admin_id,
          action,
          contribution_id,
          created_at,
          contributions (
            beach_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent logins
      const { data: logins } = await supabase
        .from('admin_access_logs')
        .select(`
          id,
          admin_id,
          created_at,
          ip_address,
          location,
          device_info
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch admin details for both
      const allAdminIds = [...new Set([
        ...(activities || []).map(a => a.admin_id),
        ...(logins || []).map(l => l.admin_id)
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', allAdminIds);

      const reviewItems = (activities || []).map(activity => {
        const profile = profiles?.find(p => p.id === activity.admin_id);
        const contribution = activity.contributions as any;
        return {
          id: activity.id,
          type: 'review',
          adminName: profile?.full_name || profile?.username || 'Admin',
          action: activity.action,
          location: contribution?.beach_name || 'Unknown Location',
          timestamp: new Date(activity.created_at),
        };
      });

      const loginItems = (logins || []).map(login => {
        const profile = profiles?.find(p => p.id === login.admin_id);
        return {
          id: login.id,
          type: 'login',
          adminName: profile?.full_name || profile?.username || 'Admin',
          action: 'login',
          location: login.location || login.ip_address || 'Unknown',
          timestamp: new Date(login.created_at),
        };
      });

      // Combine and sort
      const combined = [...reviewItems, ...loginItems]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10);

      setRecentActivity(combined);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const getActionBadge = (action: string) => {
    if (action === 'login') {
      return <Badge className="text-xs border bg-slate-100 text-slate-700 border-slate-200">Login</Badge>;
    }
    const variants: Record<string, { className: string; label: string }> = {
      classified: { className: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Classified' },
      rejected: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Rejected' },
      updated: { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Updated' },
      reclassified: { className: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Reclassified' },
    };

    const config = variants[action] || { className: 'bg-slate-100 text-slate-700 border-slate-200', label: action };
    return <Badge className={`text-xs border ${config.className}`}>{config.label}</Badge>;
  };

  const filteredContributions = contributions.filter(c =>
    c.brand_suggestion?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.beach_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statsData = [
    {
      label: "Pending Review",
      value: stats.pending,
      change: "+12%",
      changeLabel: "vs last month",
      description: "Awaiting classification",
      icon: Clock,
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
      changeColor: "text-amber-600"
    },
    {
      label: "Classified",
      value: stats.classified,
      change: "+5%",
      changeLabel: "vs last month",
      description: "Successfully processed",
      icon: CheckCircle,
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
      changeColor: "text-emerald-600"
    },
    {
      label: "New Today",
      value: `+${stats.newToday}`,
      change: "Since 00:00",
      changeLabel: "",
      description: "Activity spike detected",
      icon: TrendingUp,
      bgColor: "bg-blue-50",
      iconColor: "text-primary",
      changeColor: "text-primary"
    },
    {
      label: "Efficiency",
      value: `${stats.classificationRate}%`,
      change: "+1.6%",
      changeLabel: "vs last month",
      description: "Classification rate",
      icon: Package,
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600",
      changeColor: "text-purple-600"
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Overview of recent activity and system performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-9 text-xs font-medium border-border hover:bg-slate-50 transition-colors">
            <Filter className="h-3.5 w-3.5 mr-2" />
            Recently Updated
          </Button>
          <Button className="h-9 text-xs font-medium bg-primary hover:bg-blue-700 transition-all shadow-sm shadow-blue-900/20">
            <Download className="h-3.5 w-3.5 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Stats Cards - Data Dense Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statsData.map((stat) => (
          <Card key={stat.label} className="bg-white shadow-sm hover:shadow-lg transition-all duration-300 border-0 group">
            <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`p-2.5 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline gap-2.5">
                <div className="text-3xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </div>
                <div className={`text-xs font-bold ${stat.changeColor} flex items-center gap-1`}>
                  {stat.change}
                  <span className="text-[10px] font-medium opacity-80">{stat.changeLabel}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contributions Table and Admin Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contributions Table - Takes 2 columns */}
        <Card className="bg-white shadow-sm overflow-hidden border-0 lg:col-span-2">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-white py-5 px-6 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-bold text-foreground">Live Contributions</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Real-time submission feed</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 sm:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
                <Input
                  placeholder="Search database..."
                  className="pl-9 bg-slate-50/50 border-0 ring-1 ring-slate-100 focus:bg-white focus:ring-primary/20 transition-all shadow-sm hover:ring-slate-200"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" className="gap-2 border-0 ring-1 ring-slate-100 bg-white hover:bg-slate-50 shadow-sm text-slate-600">
                <Filter className="h-4 w-4" />
                Filter View
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Asset</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Brand ID</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Geo Location</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Timestamp</th>
                    <th className="px-6 py-3 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Status</th>
                    <th className="px-6 py-3 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredContributions.map((contribution) => (
                    <tr key={contribution.id} className="group hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 group-hover:border-primary/30 transition-colors">
                          {contribution.product_image_url ? (
                            <img
                              src={contribution.product_image_url}
                              alt="Product"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Package className="h-4 w-4 text-slate-400" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <p className="text-sm font-semibold text-foreground font-mono">
                          {contribution.brand_suggestion || 'Unknown Brand'}
                        </p>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center text-xs font-medium text-slate-600">
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mr-2" />
                          {contribution.beach_name || 'Location not specified'}
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <p className="text-xs font-mono text-muted-foreground">
                          {formatDistanceToNow(new Date(contribution.created_at), { addSuffix: true })}
                        </p>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={
                            contribution.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 font-mono text-[10px] uppercase tracking-wider'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px] uppercase tracking-wider'
                          }
                        >
                          {contribution.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                          {contribution.status === 'classified' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {contribution.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        <Link href={`/review/${contribution.id}`}>
                          <Button size="sm" variant="ghost" className="h-8 text-xs font-medium text-primary hover:text-blue-700 hover:bg-blue-50">
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            Review
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Admin Activity Section */}
        <Card className="bg-white shadow-sm overflow-hidden border-0">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white py-5 px-6 flex flex-row items-center justify-between space-y-0">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold text-foreground">Recent Admin Activity</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Latest review actions</p>
            </div>
            <Link href="/stats?tab=admin-activity">
              <Button size="sm" variant="ghost" className="text-xs text-primary hover:text-blue-700 hover:bg-blue-50">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 flex flex-col min-h-[300px]">
            {isLoadingActivity ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-slate-50/80 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 ring-1 ring-slate-100">
                  <Activity className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">No Recent Activity</h3>
                <p className="text-xs text-muted-foreground max-w-[180px]">
                  Review actions performed by admins will appear here in real-time.
                </p>
                <Link href="/contributions" className="mt-4">
                  <Button size="sm" variant="outline" className="text-xs gap-2">
                    View Contributions
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-slate-50/80 transition-all duration-200 group border-l-2 border-transparent hover:border-primary">
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className="rounded-xl bg-gradient-to-br from-white to-slate-50 p-2 shadow-sm ring-1 ring-slate-100 group-hover:scale-110 transition-transform duration-300">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-green-500 shadow-sm" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-bold text-foreground truncate pr-2">{activity.adminName}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                          {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        {getActionBadge(activity.action)}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400" />
                        <span className="truncate max-w-[140px]">{activity.location}</span>
                      </div>
                    </div>
                  </div>

                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>


    </div >
  )
}
