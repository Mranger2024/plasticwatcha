'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Check, Loader2, X, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { classifyContribution, rejectContribution } from '@/app/actions/review';
import { PRODUCT_TYPES, PLASTIC_TYPES, RECYCLABILITY_INDICATORS } from '@/lib/constants';
import { CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const reviewSchema = z.object({
  brand: z.string().min(1, 'Brand is required.'),
  manufacturer: z.string().optional(),
  productType: z.string().min(1, 'Product type is required.'),
  plasticType: z.string().min(1, 'Plastic type is required.'),
  recyclabilityIndicator: z.enum(['high', 'medium', 'low']),
  beachName: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  reviewerFeedback: z.string().optional(),
  notes: z.string().optional(),
});

type ReviewValues = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  contribution: any;
}

export function ReviewForm({ contribution }: ReviewFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      brand: contribution.brand_suggestion || '',
      manufacturer: '',
      productType: '',
      plasticType: '',
      recyclabilityIndicator: undefined,
      beachName: contribution.beach_name || '',
      latitude: contribution.latitude?.toString() || '',
      longitude: contribution.longitude?.toString() || '',
      reviewerFeedback: '',
      notes: '',
    },
  });

  const handleClassify = (data: ReviewValues) => {
    startTransition(async () => {
      // @ts-ignore - aligning types with server action
      const result = await classifyContribution(contribution.id, data);

      if (result?.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Contribution classified successfully.',
        });
        router.push('/dashboard');
        router.refresh();
      }
    });
  };

  const handleReject = () => {
    if (confirm('Are you sure you want to reject this contribution?')) {
      startTransition(async () => {
        const result = await rejectContribution(contribution.id);

        if (result?.error) {
          toast({
            title: 'Error',
            description: result.error,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Rejected',
            description: 'Contribution has been rejected.',
          });
          router.push('/dashboard');
          router.refresh();
        }
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2">
      {/* Left Column: Images */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/20 p-8 flex flex-col gap-6">
        <div>
          <h3 className="text-sm font-bold tracking-wide uppercase text-muted-foreground mb-4">Evidence 01: Product Image</h3>
          <div className="bg-white rounded-2xl shadow-md overflow-hidden p-2 border-0 ring-1 ring-slate-100">
            {contribution.product_image_url ? (
              <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                <img
                  src={contribution.product_image_url}
                  alt="Product"
                  className="object-cover w-full h-full hover:scale-105 transition-transform duration-500"
                />
              </div>
            ) : (
              <div className="aspect-square flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-muted-foreground text-sm font-medium">
                No product image available
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-3">Evidence 02: Symbol</h3>
            <div className="bg-white rounded-xl shadow-md p-1.5 border-0 ring-1 ring-slate-100">
              {contribution.recycling_symbol_image_url ? (
                <div className="relative aspect-square rounded overflow-hidden">
                  <img
                    src={contribution.recycling_symbol_image_url}
                    alt="Recycling Symbol"
                    className="object-cover w-full h-full cursor-zoom-in"
                  />
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-slate-50 rounded border border-dashed border-slate-200 text-xs text-muted-foreground">
                  No Image
                </div>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-3">Evidence 03: Manufacturer</h3>
            <div className="bg-white rounded-xl shadow-md p-1.5 border-0 ring-1 ring-slate-100">
              {contribution.manufacturer_image_url ? (
                <div className="relative aspect-square rounded overflow-hidden">
                  <img
                    src={contribution.manufacturer_image_url}
                    alt="Manufacturer"
                    className="object-cover w-full h-full cursor-zoom-in"
                  />
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-slate-50 rounded border border-dashed border-slate-200 text-xs text-muted-foreground">
                  No Image
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <h3 className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-3">Metadata</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Submitted by:</span>
              <span className="font-medium font-mono text-foreground">{contribution.user_id ? 'Registered User' : 'Anonymous'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Location:</span>
              <span className="font-medium font-mono text-foreground">{contribution.beach_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium font-mono text-foreground">{new Date(contribution.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Form */}
      <div className="p-8 bg-white">
        <CardHeader className="px-0 pt-0 pb-6 border-b border-slate-100 mb-6">
          <CardTitle className="text-xl font-bold">Classification Details</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Complete the fields below to classify this item.</p>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleClassify)} className="space-y-6">

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 rounded-sm">01</Badge>
                Product Identification
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Brand Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Coca-Cola" {...field} className="font-mono bg-slate-50 focus:bg-white transition-colors" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Manufacturer</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. The Coca-Cola Company" {...field} className="font-mono bg-slate-50 focus:bg-white transition-colors" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Product Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-50 focus:bg-white transition-colors">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRODUCT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="font-mono text-xs">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="bg-slate-100" />

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 rounded-sm">02</Badge>
                Material Analysis
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="plasticType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Plastic Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-50 focus:bg-white transition-colors">
                            <SelectValue placeholder="Select code" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PLASTIC_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value} className="font-mono text-xs">
                              <span className="font-bold mr-2">{type.code}</span>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recyclabilityIndicator"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Recyclability</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-50 focus:bg-white transition-colors">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RECYCLABILITY_INDICATORS.map((status) => (
                            <SelectItem key={status.value} value={status.value} className="font-mono text-xs">
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator className="bg-slate-100" />

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 rounded-sm">03</Badge>
                Location Details
              </h4>

              <FormField
                control={form.control}
                name="beachName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Location Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Marina Beach" {...field} className="bg-slate-50 focus:bg-white transition-colors" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Latitude</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 13.0827" {...field} className="font-mono bg-slate-50 focus:bg-white transition-colors text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Longitude</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 80.2707" {...field} className="font-mono bg-slate-50 focus:bg-white transition-colors text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator className="bg-slate-100" />

            <div className="space-y-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 rounded-sm">04</Badge>
                Feedback & Notes
              </h4>

              <FormField
                control={form.control}
                name="reviewerFeedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Feedback to Contributor</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Thank you for your contribution! This helps us track plastic waste..."
                        className="resize-none min-h-[80px] bg-slate-50 focus:bg-white transition-colors text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any notes for other admins..."
                        className="resize-none min-h-[80px] bg-slate-50 focus:bg-white transition-colors text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="bg-slate-200" />

            <div className="flex gap-4 pt-6 border-t border-slate-100 mt-8">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all"
                onClick={handleReject}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                Reject
              </Button>
              <Button
                type="submit"
                className="flex-[2] bg-primary hover:bg-blue-700 shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/30 transition-all"
                disabled={isPending}
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Approve & Classify
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
