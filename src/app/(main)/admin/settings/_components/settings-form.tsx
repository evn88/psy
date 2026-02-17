'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { updateSettings } from '../actions';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  language: z.string(),
  theme: z.string()
});

interface SettingsFormProps {
  initialSettings: {
    language: string;
    theme: string;
  };
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const { setTheme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialSettings
  });

  // Sync local theme with DB preference on mount
  useEffect(() => {
    if (initialSettings.theme) {
      setTheme(initialSettings.theme);
    }
  }, [initialSettings.theme, setTheme]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    // Optimistic / Immediate update
    setTheme(values.theme);

    const result = await updateSettings(values);
    setLoading(false);

    if (result.success) {
      router.refresh();
    } else {
      console.error(result.error);
      // Revert if needed, but for theme it's fine
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance & Language</CardTitle>
            <CardDescription>Customize how the admin panel looks and feels.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    This is the language that will be used in the dashboard.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a theme" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>Select the theme for the dashboard.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save preferences'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
