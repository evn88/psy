import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AccountDeletedPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Страница-заглушка после успешного удаления аккаунта.
 * Не требует авторизации. Исключена из индексации.
 */
export default async function AccountDeletedPage({ params }: AccountDeletedPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('AccountDeleted');
  const tProfile = await getTranslations('Profile');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border shadow-lg text-center">
        <CardHeader className="space-y-4 pb-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
              <path d="m15 11 2 2 4-4" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">{t('title')}</CardTitle>
          <CardDescription className="text-base">{t('subtitle')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{t('message')}</p>
            <p>{t('regretMessage')}</p>
          </div>

          <div className="flex flex-col gap-3">
            <Button asChild>
              <Link href="/auth">{t('registerButton')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">{tProfile('goToHome')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
