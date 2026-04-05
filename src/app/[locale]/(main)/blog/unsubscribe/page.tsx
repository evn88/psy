import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Blog Unsubscribe',
  robots: {
    index: false,
    follow: false
  }
};

interface BlogUnsubscribePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}

/**
 * Страница подтверждения отписки от уведомлений блога.
 * Выполняет действие только после явного POST.
 */
export default async function BlogUnsubscribePage({
  params,
  searchParams
}: BlogUnsubscribePageProps) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('BlogUnsubscribeConfirm');
  const isTokenPresent = typeof token === 'string' && token.trim().length > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isTokenPresent ? t('title') : t('invalidTitle')}
          </CardTitle>
          <CardDescription>
            {isTokenPresent ? t('description') : t('invalidDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isTokenPresent ? (
            <form action="/api/blog/unsubscribe" method="post" className="space-y-3">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="destructive" className="w-full">
                {t('action')}
              </Button>
            </form>
          ) : null}
          <Button variant="outline" className="w-full" asChild>
            <Link href="/blog">{t('backToBlog')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
