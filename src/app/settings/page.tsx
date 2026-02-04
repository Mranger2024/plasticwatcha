'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  Save,
  Upload,
  Image as ImageIcon,
  Globe,
  FileText,
  ToggleLeft,
  ToggleRight,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase/client';

// Form schemas
const generalSettingsSchema = z.object({
  siteName: z.string().min(2, 'Site name must be at least 2 characters'),
  siteDescription: z.string().optional(),
  contactEmail: z.string().email('Please enter a valid email').optional(),
});

const aiSettingsSchema = z.object({
  enableImageRecognition: z.boolean(),
  confidenceThreshold: z.number().min(0).max(1),
});

type GeneralSettings = z.infer<typeof generalSettingsSchema>;
type AISettings = z.infer<typeof aiSettingsSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentLogo, setCurrentLogo] = useState('');
  const [currentFavicon, setCurrentFavicon] = useState('');

  // Form handlers
  const generalForm = useForm<GeneralSettings>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      siteName: 'Plastic Watch',
      siteDescription: 'Tracking plastic pollution worldwide',
    },
  });

  const aiForm = useForm<AISettings>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: {
      enableImageRecognition: false,
      confidenceThreshold: 0.7,
    },
  });

  const { register: registerAI, handleSubmit: handleAISubmit, watch: watchAI, setValue: setAIValue, formState: { isDirty: isAIDirty } } = aiForm;

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // In a real app, you would fetch these from your database
        const { data: settings } = await supabase
          .from('settings')
          .select('*')
          .single();

        if (settings) {
          generalForm.reset({
            siteName: settings.site_name,
            siteDescription: settings.site_description,
            contactEmail: settings.contact_email,
          });

          aiForm.reset({
            enableImageRecognition: settings.ai_enabled,
            confidenceThreshold: settings.ai_confidence_threshold || 0.7,
          });

          setCurrentLogo(settings.site_logo_url || '');
          setCurrentFavicon(settings.favicon_url || '');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleFileUpload = async (file: File, type: 'logo' | 'favicon') => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${type}s/${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      // Update the appropriate state
      if (type === 'logo') {
        setCurrentLogo(publicUrl);
        // Save to database
        await supabase
          .from('settings')
          .upsert({ id: 1, site_logo_url: publicUrl }, { onConflict: 'id' });
      } else {
        setCurrentFavicon(publicUrl);
        // Save to database
        await supabase
          .from('settings')
          .upsert({ id: 1, favicon_url: publicUrl }, { onConflict: 'id' });
      }

      toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const onGeneralSubmit = async (data: GeneralSettings) => {
    try {
      await supabase
        .from('settings')
        .upsert({
          id: 1,
          site_name: data.siteName,
          site_description: data.siteDescription,
          contact_email: data.contactEmail,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      toast.success('General settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const onAISubmit = async (data: AISettings) => {
    try {
      await supabase
        .from('settings')
        .upsert({
          id: 1,
          ai_enabled: data.enableImageRecognition,
          ai_confidence_threshold: data.confidenceThreshold,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      toast.success('AI settings saved successfully');
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast.error('Failed to save AI settings');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-md" />
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 w-full bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your site settings and preferences
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="general">
            <Globe className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <ImageIcon className="mr-2 h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="ai">
            <ToggleLeft className="mr-2 h-4 w-4" />
            AI Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <form onSubmit={generalForm.handleSubmit(onGeneralSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Update your site's general information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      placeholder="Site name"
                      {...generalForm.register('siteName')}
                    />
                    {generalForm.formState.errors.siteName && (
                      <p className="text-sm text-destructive">
                        {generalForm.formState.errors.siteName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="contact@example.com"
                      {...generalForm.register('contactEmail')}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Site Description</Label>
                  <Input
                    id="siteDescription"
                    placeholder="A brief description of your site"
                    {...generalForm.register('siteDescription')}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={!generalForm.formState.isDirty}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of your site
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Site Logo</h4>
                    <p className="text-sm text-muted-foreground">
                      Upload your site logo. Recommended size: 200x50px
                    </p>
                  </div>
                  <div className="relative">
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'logo');
                      }}
                      disabled={uploading}
                    />
                    <Label
                      htmlFor="logo-upload"
                      className={cn(
                        'cursor-pointer',
                        uploading && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Button type="button" variant="outline" disabled={uploading}>
                        <Upload className="mr-2 h-4 w-4" />
                        {uploading ? 'Uploading...' : 'Upload Logo'}
                      </Button>
                    </Label>
                  </div>
                </div>
                {currentLogo && (
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-2">Current Logo:</p>
                    <img
                      src={currentLogo}
                      alt="Site Logo"
                      className="h-12 object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Favicon</h4>
                    <p className="text-sm text-muted-foreground">
                      Upload your site favicon. Recommended size: 32x32px
                    </p>
                  </div>
                  <div className="relative">
                    <Input
                      id="favicon-upload"
                      type="file"
                      accept="image/x-icon,.ico"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'favicon');
                      }}
                      disabled={uploading}
                    />
                    <Label
                      htmlFor="favicon-upload"
                      className={cn(
                        'cursor-pointer',
                        uploading && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Button type="button" variant="outline" disabled={uploading}>
                        <Upload className="mr-2 h-4 w-4" />
                        {uploading ? 'Uploading...' : 'Upload Favicon'}
                      </Button>
                    </Label>
                  </div>
                </div>
                {currentFavicon && (
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-2">Current Favicon:</p>
                    <img
                      src={currentFavicon}
                      alt="Favicon"
                      className="h-8 w-8 object-contain"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <form onSubmit={handleAISubmit(onAISubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>AI Settings</CardTitle>
                <CardDescription>
                  Configure AI-powered features for your site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>AI Image Recognition</AlertTitle>
                  <AlertDescription>
                    Enable or disable automatic image recognition for plastic waste submissions.
                  </AlertDescription>
                </Alert>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="enableImageRecognition" className="text-base">
                      Enable AI Image Recognition
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically detect and classify plastic waste in uploaded images
                    </p>
                  </div>
                  <Switch
                    id="enableImageRecognition"
                    checked={watchAI('enableImageRecognition')}
                    onCheckedChange={(checked) =>
                      setAIValue('enableImageRecognition', checked, { shouldDirty: true })
                    }
                  />
                </div>

                {watchAI('enableImageRecognition') && (
                  <div className="space-y-4 rounded-lg border p-4">
                    <div>
                      <Label htmlFor="confidenceThreshold" className="mb-2 block">
                        Confidence Threshold: {Math.round(watchAI('confidenceThreshold') * 100)}%
                      </Label>
                      <Input
                        id="confidenceThreshold"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        {...registerAI('confidenceThreshold', {
                          valueAsNumber: true,
                          onChange: (e) => {
                            setAIValue('confidenceThreshold', parseFloat(e.target.value), { shouldDirty: true });
                          }
                        })}
                        className="w-full"
                      />
                      <p className="mt-1 text-sm text-muted-foreground">
                        Set the minimum confidence level required for AI to classify an image
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={!isAIDirty}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save AI Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
