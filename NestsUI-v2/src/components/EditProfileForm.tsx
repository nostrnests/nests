import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useDittoProfile } from '@/hooks/useDittoProfile';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Textarea } from '@/components/ui/textarea';
import { ThemeChooser } from '@/components/ThemeChooser';
import { Loader2, Upload } from 'lucide-react';
import { NSchema as n, type NostrMetadata, type NostrEvent } from '@nostrify/nostrify';
import { useQueryClient } from '@tanstack/react-query';
import { useUploadFile } from '@/hooks/useUploadFile';
import { isEmoji, getEmojiMaskUrl } from '@/lib/ditto-theme';
import { DITTO_PROFILE_THEME } from '@/lib/const';
import type { DittoTheme } from '@/lib/ditto-theme';
import type { DittoThemeEntry } from '@/hooks/useDittoThemes';

export const EditProfileForm: React.FC = () => {
  const queryClient = useQueryClient();

  const { user, metadata } = useCurrentUser();
  const author = useAuthor(user?.pubkey);
  const { mutateAsync: publishEvent, isPending } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { data: existingProfileTheme } = useDittoProfile(user?.pubkey);
  const { toast } = useToast();

  // Avatar shape state
  const [shape, setShape] = useState('');
  const [profileTheme, setProfileTheme] = useState<DittoTheme | null>(null);
  const [profileThemeEntry, setProfileThemeEntry] = useState<DittoThemeEntry | null>(null);

  // Parse existing shape from raw event content
  useEffect(() => {
    try {
      const parsed = JSON.parse(author.data?.event?.content ?? '{}');
      if (isEmoji(parsed.shape)) setShape(parsed.shape);
    } catch { /* ignore */ }
  }, [author.data?.event?.content]);

  // Sync profile theme from existing
  useEffect(() => {
    if (existingProfileTheme) setProfileTheme(existingProfileTheme);
  }, [existingProfileTheme]);

  // Shape preview mask
  const shapeMask = useMemo(() => {
    if (!isEmoji(shape)) return undefined;
    const url = getEmojiMaskUrl(shape);
    return url || undefined;
  }, [shape]);

  // Initialize the form with default values
  const form = useForm<NostrMetadata>({
    resolver: zodResolver(n.metadata()),
    defaultValues: {
      name: '',
      about: '',
      picture: '',
      banner: '',
      website: '',
      nip05: '',
    },
  });

  // Update form values when user data is loaded
  useEffect(() => {
    if (metadata) {
      form.reset({
        name: metadata.name || '',
        about: metadata.about || '',
        picture: metadata.picture || '',
        banner: metadata.banner || '',
        website: metadata.website || '',
        nip05: metadata.nip05 || '',
      });
    }
  }, [metadata, form]);

  // Handle file uploads for profile picture and banner
  const uploadPicture = async (file: File, field: 'picture' | 'banner') => {
    try {
      // The first tuple in the array contains the URL
      const [[_, url]] = await uploadFile(file);
      form.setValue(field, url);
      toast({
        title: 'Success',
        description: `${field === 'picture' ? 'Profile picture' : 'Banner'} uploaded successfully`,
      });
    } catch (error) {
      console.error(`Failed to upload ${field}:`, error);
      toast({
        title: 'Error',
        description: `Failed to upload ${field === 'picture' ? 'profile picture' : 'banner'}. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (values: NostrMetadata) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update your profile',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Combine existing metadata with new values, preserving extra fields
      let existingData: Record<string, unknown> = {};
      try {
        existingData = JSON.parse(author.data?.event?.content ?? '{}');
      } catch { /* ignore */ }

      const data: Record<string, unknown> = { ...existingData, ...values };

      // Add shape if set
      if (shape && isEmoji(shape)) {
        data.shape = shape;
      } else {
        delete data.shape;
      }

      // Clean up empty values
      for (const key in data) {
        if (data[key] === '') {
          delete data[key];
        }
      }

      // Publish the metadata event (kind 0)
      await publishEvent({
        kind: 0,
        content: JSON.stringify(data),
      });

      // Publish profile theme (kind:16767) if set
      if (profileTheme) {
        const themeTags: string[][] = [
          ["c", profileTheme.colors.background, "background"],
          ["c", profileTheme.colors.text, "text"],
          ["c", profileTheme.colors.primary, "primary"],
        ];
        if (profileTheme.font) {
          const fontTag = ["f", profileTheme.font.family];
          if (profileTheme.font.url) fontTag.push(profileTheme.font.url);
          themeTags.push(fontTag);
        }
        if (profileTheme.background) {
          themeTags.push(["bg", `url ${profileTheme.background.url}`, `mode ${profileTheme.background.mode}`]);
        }
        themeTags.push(["alt", "Ditto profile theme"]);

        await publishEvent({
          kind: DITTO_PROFILE_THEME,
          content: "",
          tags: themeTags,
        });
      }

      // Optimistically update the author cache with the new data
      queryClient.setQueryData(['nostr', 'author', user.pubkey], (old: { event?: NostrEvent; metadata?: NostrMetadata } | undefined) => {
        const newEvent = {
          ...(old?.event ?? { kind: 0, pubkey: user.pubkey, id: '', sig: '', tags: [], created_at: Math.floor(Date.now() / 1000) }),
          content: JSON.stringify(data),
        };
        let newMetadata: NostrMetadata | undefined;
        try {
          newMetadata = n.json().pipe(n.metadata()).parse(newEvent.content);
        } catch { /* ignore */ }
        return { event: newEvent, metadata: newMetadata ?? old?.metadata };
      });

      // Invalidate to refetch from relay (picks up relay-confirmed data)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['nostr', 'author', user.pubkey] });
        queryClient.invalidateQueries({ queryKey: ['nostr', 'ditto-profile', user.pubkey] });
      }, 2000);

      toast({
        title: 'Success',
        description: 'Your profile has been updated',
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update your profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormDescription>
                This is your display name that will be displayed to others.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="about"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tell others about yourself" 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                A short description about yourself.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="picture"
            render={({ field }) => (
              <ImageUploadField
                field={field}
                label="Profile Picture"
                placeholder="https://example.com/profile.jpg"
                description="URL to your profile picture. You can upload an image or provide a URL."
                previewType="square"
                onUpload={(file) => uploadPicture(file, 'picture')}
              />
            )}
          />

          <FormField
            control={form.control}
            name="banner"
            render={({ field }) => (
              <ImageUploadField
                field={field}
                label="Banner Image"
                placeholder="https://example.com/banner.jpg"
                description="URL to a wide banner image for your profile. You can upload an image or provide a URL."
                previewType="wide"
                onUpload={(file) => uploadPicture(file, 'banner')}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://yourwebsite.com" {...field} />
                </FormControl>
                <FormDescription>
                  Your personal website or social media link.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nip05"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NIP-05 Identifier</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormDescription>
                  Your verified Nostr identifier.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Avatar Shape */}
        <div className="space-y-3">
          <Label>Avatar Shape</Label>
          <p className="text-xs text-muted-foreground">
            Enter an emoji to use as your avatar mask. Leave empty for a circle.
          </p>
          <div className="flex items-center gap-4">
            <Input
              value={shape}
              onChange={(e) => setShape(e.target.value.trim())}
              placeholder="e.g. 🔷 ⭐ ❤️ ⬡"
              className="w-32"
            />
            <div className="shrink-0">
              <Avatar
                className="h-14 w-14"
                style={shapeMask ? {
                  WebkitMaskImage: `url(${shapeMask})`,
                  maskImage: `url(${shapeMask})`,
                  WebkitMaskSize: 'cover',
                  maskSize: 'cover',
                  borderRadius: 0,
                } : undefined}
              >
                <AvatarImage src={metadata?.picture} />
                <AvatarFallback className="bg-secondary text-sm">
                  {(metadata?.name || '??').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>

        {/* Profile Theme */}
        <div className="space-y-3">
          <Label>Profile Theme</Label>
          <p className="text-xs text-muted-foreground">
            Choose a theme that others see when they view your profile card.
          </p>
          <ThemeChooser
            selectedTheme={profileTheme}
            onSelectTheme={(theme, entry) => {
              setProfileTheme(theme);
              setProfileThemeEntry(entry ?? null);
            }}
          />
        </div>

        <Button
          type="submit"
          className="w-full md:w-auto"
          disabled={isPending || isUploading}
        >
          {(isPending || isUploading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save Profile
        </Button>
      </form>
    </Form>
  );
};

// Reusable component for image upload fields
interface ImageUploadFieldProps {
  field: {
    value: string | undefined;
    onChange: (value: string) => void;
    name: string;
    onBlur: () => void;
  };
  label: string;
  placeholder: string;
  description: string;
  previewType: 'square' | 'wide';
  onUpload: (file: File) => void;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  field,
  label,
  placeholder,
  description,
  previewType,
  onUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <div className="flex flex-col gap-2">
        <FormControl>
          <Input
            placeholder={placeholder}
            name={field.name}
            value={field.value ?? ''}
            onChange={e => field.onChange(e.target.value)}
            onBlur={field.onBlur}
          />
        </FormControl>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUpload(file);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
          {field.value && (
            <div className={`h-10 ${previewType === 'square' ? 'w-10' : 'w-24'} rounded overflow-hidden`}>
              <img 
                src={field.value} 
                alt={`${label} preview`} 
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
      <FormDescription>
        {description}
      </FormDescription>
      <FormMessage />
    </FormItem>
  );
};
