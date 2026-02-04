'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { 
  Save, 
  ArrowLeft,
  Image as ImageIcon,
  Tag,
  Eye,
  Loader2,
  X,
  Calendar,
  Clock,
  Upload,
  FileText as FileTextIcon
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// Form validation schema
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  excerpt: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  tags: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  published: z.boolean().default(false),
  scheduledPublish: z.boolean().default(false),
  publishDate: z.string().optional(),
  publishTime: z.string().optional(),
  featured: z.boolean().default(false),
  importFile: z.any().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function NewBlogPostPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      published: false,
      scheduledPublish: false,
      featured: false,
      publishDate: new Date().toISOString().split('T')[0],
      publishTime: '12:00',
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const content = await file.text();
      
      // Try to parse as JSON first (for full export format)
      try {
        const parsed = JSON.parse(content);
        reset({
          title: parsed.title || '',
          excerpt: parsed.excerpt || '',
          content: parsed.content || '',
          tags: parsed.tags?.join(', ') || '',
          metaTitle: parsed.meta_title || '',
          metaDescription: parsed.meta_description || '',
          featured: parsed.featured || false,
        });
        
        if (parsed.cover_image_url) {
          toast.info('Please re-upload the cover image for this post');
        }
        
        toast.success('Blog post imported successfully!');
      } catch (e) {
        // If not JSON, treat as markdown
        const lines = content.split('\n');
        const title = lines[0].startsWith('# ') ? lines[0].substring(2) : 'Imported Post';
        const contentStart = lines[0].startsWith('# ') ? 1 : 0;
        
        reset({
          title,
          content: lines.slice(contentStart).join('\n'),
        });
        
        toast.success('Markdown content imported successfully!');
      }
    } catch (error) {
      console.error('Error importing file:', error);
      toast.error('Failed to import file. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `blog/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('blog-images')
      .upload(filePath, file);
    
    if (error) throw error;
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('blog-images')
      .getPublicUrl(data.path);
      
    return publicUrl;
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      
      // Handle scheduling
      let publishedAt = null;
      if (data.scheduledPublish && data.publishDate && data.publishTime) {
        const [hours, minutes] = data.publishTime.split(':').map(Number);
        const publishDate = new Date(data.publishDate);
        publishDate.setHours(hours, minutes, 0, 0);
        publishedAt = publishDate.toISOString();
      }
      
      // Upload cover image if exists
      let coverImageUrl = '';
      if (coverImage) {
        coverImageUrl = await uploadImage(coverImage);
      }
      
      // Process tags
      const tags = data.tags 
        ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];
      
      // Create blog post
      const { data: post, error } = await supabase
        .from('blog_posts')
        .insert([
          {
            title: data.title,
            excerpt: data.excerpt,
            content: data.content,
            cover_image_url: coverImageUrl || null,
            tags: tags,
            meta_title: data.metaTitle,
            meta_description: data.metaDescription,
            published: data.scheduledPublish ? false : data.published,
            published_at: data.scheduledPublish ? publishedAt : (data.published ? new Date().toISOString() : null),
            scheduled_publish_at: data.scheduledPublish ? publishedAt : null,
            featured: data.featured,
          },
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(data.scheduledPublish 
        ? 'Blog post scheduled successfully!' 
        : data.published 
          ? 'Blog post published successfully!' 
          : 'Draft saved successfully!');
      
      router.push('/admin/blog');
    } catch (error) {
      console.error('Error saving blog post:', error);
      toast.error('Failed to save blog post. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Blog
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">New Blog Post</h2>
          <p className="text-muted-foreground">
            Create a new blog post for your website
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant={watch('published') ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setValue('published', !watch('published'));
              setValue('scheduledPublish', false);
            }}
            disabled={watch('scheduledPublish')}
          >
            {watch('published') ? 'Published' : 'Draft'}
          </Button>
          <Button 
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Post
              </>
            )}
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="publishing">Publishing</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
        </TabsList>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6">
            <TabsContent value="content" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Post Content</CardTitle>
                  <CardDescription>
                    Add your blog post content here
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="Enter post title"
                      {...register('title')}
                      className={cn(
                        'text-lg font-medium',
                        errors.title && 'border-red-500'
                      )}
                    />
                    {errors.title && (
                      <p className="text-sm text-red-500">{errors.title.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea
                      id="excerpt"
                      placeholder="A short excerpt for your post"
                      {...register('excerpt')}
                      className={cn(
                        'min-h-[100px]',
                        errors.excerpt && 'border-red-500'
                      )}
                    />
                    {errors.excerpt && (
                      <p className="text-sm text-red-500">{errors.excerpt.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="content">Content *</Label>
                    <Textarea
                      id="content"
                      placeholder="Write your post content here..."
                      {...register('content')}
                      className={cn(
                        'min-h-[300px] font-sans',
                        errors.content && 'border-red-500'
                      )}
                    />
                    {errors.content && (
                      <p className="text-sm text-red-500">{errors.content.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Featured Image</CardTitle>
                  <CardDescription>
                    Add a featured image to your blog post
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
                    {previewUrl ? (
                      <div className="relative">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="mx-auto max-h-48 rounded-md"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute -top-2 -right-2"
                          onClick={() => {
                            setCoverImage(null);
                            setPreviewUrl(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-center">
                        <div className="flex justify-center">
                          <ImageIcon className="h-12 w-12 text-gray-400" />
                        </div>
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                          >
                            <span>Upload an image</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              onChange={handleImageUpload}
                              accept="image/*"
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="seo" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>SEO Settings</CardTitle>
                  <CardDescription>
                    Optimize your post for search engines
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="metaTitle">Meta Title</Label>
                    <Input
                      id="metaTitle"
                      placeholder="Enter meta title"
                      {...register('metaTitle')}
                    />
                    <p className="text-sm text-muted-foreground">
                      If empty, the post title will be used.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="metaDescription">Meta Description</Label>
                    <Textarea
                      id="metaDescription"
                      placeholder="Enter meta description"
                      {...register('metaDescription')}
                      className="min-h-[100px]"
                    />
                    <p className="text-sm text-muted-foreground">
                      If empty, the post excerpt will be used.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="publishing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Publishing Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-1">
                      <Label>Publish Now</Label>
                      <p className="text-sm text-muted-foreground">
                        Publish this post immediately when saved.
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        className={cn(
                          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                          watch('published') && !watch('scheduledPublish') ? 'bg-indigo-600' : 'bg-gray-200',
                          watch('scheduledPublish') ? 'opacity-50 cursor-not-allowed' : ''
                        )}
                        onClick={() => {
                          setValue('published', !watch('published'));
                          setValue('scheduledPublish', false);
                        }}
                        disabled={watch('scheduledPublish')}
                      >
                        <span className="sr-only">Publish now</span>
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                            watch('published') && !watch('scheduledPublish') ? 'translate-x-5' : 'translate-x-0'
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Schedule for Later</Label>
                        <p className="text-sm text-muted-foreground">
                          Schedule this post to be published at a specific date and time.
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          className={cn(
                            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                            watch('scheduledPublish') ? 'bg-indigo-600' : 'bg-gray-200',
                            watch('published') && !watch('scheduledPublish') ? 'opacity-50 cursor-not-allowed' : ''
                          )}
                          onClick={() => {
                            const willSchedule = !watch('scheduledPublish');
                            setValue('scheduledPublish', willSchedule);
                            if (willSchedule) {
                              setValue('published', false);
                            }
                          }}
                          disabled={watch('published') && !watch('scheduledPublish')}
                        >
                          <span className="sr-only">Schedule for later</span>
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                              watch('scheduledPublish') ? 'translate-x-5' : 'translate-x-0'
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    {watch('scheduledPublish') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor="publishDate">Date</Label>
                          <div className="relative">
                            <Input
                              id="publishDate"
                              type="date"
                              min={new Date().toISOString().split('T')[0]}
                              {...register('publishDate')}
                            />
                            <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="publishTime">Time</Label>
                          <div className="relative">
                            <Input
                              id="publishTime"
                              type="time"
                              {...register('publishTime')}
                            />
                            <Clock className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                        {watch('publishDate') && watch('publishTime') && (
                          <div className="col-span-2 text-sm text-muted-foreground">
                            Post will be published on {new Date(`${watch('publishDate')}T${watch('publishTime')}`).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="options" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Post Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-1">
                      <Label>Featured Post</Label>
                      <p className="text-sm text-muted-foreground">
                        Mark this post as featured to highlight it on the blog homepage.
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        {watch('featured') ? 'Yes' : 'No'}
                      </span>
                      <button
                        type="button"
                        className={cn(
                          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                          watch('featured') ? 'bg-indigo-600' : 'bg-gray-200'
                        )}
                        onClick={() => setValue('featured', !watch('featured'))}
                      >
                        <span className="sr-only">Toggle featured</span>
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                            watch('featured') ? 'translate-x-5' : 'translate-x-0'
                          )}
                        />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Import Content</Label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 rounded-md">
                        <div className="space-y-1 text-center">
                          <div className="flex justify-center">
                            <Upload className="h-12 w-12 text-gray-400" />
                          </div>
                          <div className="flex text-sm text-gray-600">
                            <label
                              htmlFor="file-import"
                              className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                            >
                              <span>Upload a file</span>
                              <input
                                id="file-import"
                                name="file-import"
                                type="file"
                                className="sr-only"
                                onChange={handleFileImport}
                                accept=".md,.json,.txt"
                                disabled={isImporting}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">
                            Markdown (.md), JSON (.json), or text (.txt)
                          </p>
                          {isImporting && (
                            <div className="flex items-center justify-center pt-2">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              <span>Importing...</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Import markdown content or a previously exported blog post.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="tags">Tags</Label>
                    <div className="relative">
                      <Input
                        id="tags"
                        placeholder="Add tags separated by commas"
                        {...register('tags')}
                      />
                      <Tag className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add tags to help users find your post.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </form>
      </Tabs>
    </div>
  );
}
