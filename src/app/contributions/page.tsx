'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { supabase } from '@/lib/supabase/client';

interface Contribution {
  id: string;
  created_at: string;
  status: 'pending' | 'classified' | 'rejected';
  brand: string | null;
  brand_suggestion: string | null;
  beach_name: string | null;
  product_image_url: string | null;
  user_id: string;
  latitude: number;
  longitude: number;
  backside_image_url: string | null;
  recycling_image_url: string | null;
  manufacturer_image_url: string | null;
  notes: string | null;
}

export default function ContributionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contributions, setContributions] = useState<{
    pending: Contribution[];
    classified: Contribution[];
    rejected: Contribution[];
  }>({ pending: [], classified: [], rejected: [] });
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchContributions();
  }, []);

  const fetchContributions = async () => {
    try {
      setLoading(true);

      // Fetch all contributions with their status
      const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by status
      const grouped = {
        pending: data.filter((c: Contribution) => c.status === 'pending'),
        classified: data.filter((c: Contribution) => c.status === 'classified'),
        rejected: data.filter((c: Contribution) => c.status === 'rejected')
      };

      setContributions(grouped);
    } catch (error) {
      console.error('Error fetching contributions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (id: string) => {
    router.push(`/review/${id}`);
  };

  const renderContributionCard = (contribution: Contribution) => (
    <Card key={contribution.id} className="mb-3 hover:shadow-md transition-all duration-200 border-0 shadow-sm group">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <div className="flex items-center space-x-4">
          {contribution.product_image_url ? (
            <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-border group-hover:border-primary/20 transition-colors bg-slate-50">
              <img
                src={contribution.product_image_url}
                alt={contribution.brand || 'Contribution'}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-lg bg-slate-100 flex items-center justify-center border border-border">
              <Icons.fileText className="h-6 w-6 text-slate-400" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-foreground font-mono text-sm">
              {contribution.brand || contribution.brand_suggestion || 'Unknown Brand'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground flex items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-1.5" />
                {contribution.beach_name || 'Location not specified'}
              </span>
              <span className="text-[10px] text-slate-400">•</span>
              <span className="text-xs text-muted-foreground font-mono">
                {format(new Date(contribution.created_at), 'MMM d, yyyy HH:mm')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge
            variant="outline"
            className={`${contribution.status === 'classified'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : contribution.status === 'rejected'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
              } font-mono text-[10px] uppercase tracking-wider px-2 py-0.5`}
          >
            {contribution.status}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReview(contribution.id)}
            className="h-8 text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5"
          >
            <Icons.fileText className="h-3.5 w-3.5 mr-1.5" />
            Review
          </Button>
        </div>
      </CardHeader>
    </Card>
  );

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-md" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-mono text-foreground">Contributions</h1>
          <p className="text-muted-foreground mt-1 font-medium">
            Manage and review user contributions
          </p>
        </div>
      </div>

      <Tabs
        defaultValue="pending"
        className="space-y-6"
        onValueChange={setActiveTab}
        value={activeTab}
      >
        <div className="border-b border-border">
          <TabsList className="bg-transparent h-12 p-0 space-x-6">
            <TabsTrigger
              value="pending"
              className="h-12 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pending Review
              {contributions.pending.length > 0 && (
                <Badge className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
                  {contributions.pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="classified"
              className="h-12 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent data-[state=active]:text-emerald-700 data-[state=active]:shadow-none font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Classified
              {contributions.classified.length > 0 && (
                <Badge className="ml-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                  {contributions.classified.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="h-12 px-0 rounded-none border-b-2 border-transparent data-[state=active]:border-destructive data-[state=active]:bg-transparent data-[state=active]:text-destructive data-[state=active]:shadow-none font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Rejected
              {contributions.rejected.length > 0 && (
                <Badge className="ml-2 bg-slate-100 text-slate-600 border-slate-200">
                  {contributions.rejected.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pending" className="space-y-4 pt-2">
          {loading ? (
            renderSkeleton()
          ) : contributions.pending.length > 0 ? (
            contributions.pending.map(renderContributionCard)
          ) : (
            <Card className="bg-slate-50 border-dashed border-2 border-slate-200 shadow-none">
              <CardContent className="py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4">
                  <Icons.fileText className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">No pending items</h3>
                <p className="text-sm text-muted-foreground mt-1">All contributions have been reviewed.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="classified" className="space-y-4 pt-2">
          {loading ? (
            renderSkeleton()
          ) : contributions.classified.length > 0 ? (
            contributions.classified.map(renderContributionCard)
          ) : (
            <Card className="bg-slate-50 border-dashed border-2 border-slate-200 shadow-none">
              <CardContent className="py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4">
                  <Icons.checkCircle className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">No classified items</h3>
                <p className="text-sm text-muted-foreground mt-1">Classified items will appear here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 pt-2">
          {loading ? (
            renderSkeleton()
          ) : contributions.rejected.length > 0 ? (
            contributions.rejected.map(renderContributionCard)
          ) : (
            <Card className="bg-slate-50 border-dashed border-2 border-slate-200 shadow-none">
              <CardContent className="py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-4">
                  <Icons.alertTriangle className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">No rejected items</h3>
                <p className="text-sm text-muted-foreground mt-1">Rejected items will appear here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
