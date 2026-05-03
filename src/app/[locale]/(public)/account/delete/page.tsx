import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Delete Account',
  robots: {
    index: false,
    follow: false
  }
};

interface AccountDeletePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; error?: string }>;
}

/**
 * Страница подтверждения удаления аккаунта.
 * Выполняет удаление только после one-time POST.
 */
export default async function AccountDeletePage({ params, searchParams }: AccountDeletePageProps) {
  const { locale } = await params;
  const { token, error } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('AccountDeletionConfirm');
  const canSubmit = typeof token === 'string' && token.trim().length > 0 && !error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {canSubmit ? t('title') : t('invalidTitle')}
          </CardTitle>
          <CardDescription>
            {canSubmit ? t('description') : t('invalidDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canSubmit ? <p className="text-sm text-destructive">{t('warning')}</p> : null}
          {canSubmit ? (
            <form action="/api/profile/delete" method="post" className="space-y-3">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="destructive" className="w-full">
                {t('action')}
              </Button>
            </form>
          ) : null}
          <Button variant="outline" className="w-full" asChild>
            <Link href="/">{t('backToHome')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
