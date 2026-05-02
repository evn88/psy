'use client';

import { useState, useTransition } from 'react';
import { Check, SkipForward, Pill } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { confirmPilloIntakeTokenAction, skipPilloIntakeTokenAction } from '../../../actions';

interface TakeConfirmationProps {
  token: string;
}

/**
 * Клиентская карточка подтверждения или пропуска приёма по одноразовой ссылке.
 * Если в URL присутствует query-параметр action=skip, отображает UI пропуска.
 * @param props - токен из URL.
 * @returns UI подтверждения действия.
 */
export const TakeConfirmation = ({ token }: TakeConfirmationProps) => {
  const t = useTranslations('Pillo.takeLink');
  const searchParams = useSearchParams();
  const isSkipMode = searchParams.get('action') === 'skip';

  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * Подтверждает приём через server action.
   */
  const confirm = () => {
    startTransition(() => {
      void confirmPilloIntakeTokenAction(token).then(result => {
        setMessage(result.success ? t('success') : (result.error ?? t('error')));
      });
    });
  };

  /**
   * Пропускает приём через server action.
   */
  const skip = () => {
    startTransition(() => {
      void skipPilloIntakeTokenAction(token).then(result => {
        setMessage(result.success ? t('skipSuccess') : (result.error ?? t('error')));
      });
    });
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--accent)),transparent_36%),hsl(var(--background))] px-4">
      <Card className="w-full max-w-md rounded-[1.75rem] border-white/60 bg-card/95 shadow-xl dark:border-white/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 rounded-3xl bg-foreground p-4 text-background">
            <Pill className="h-7 w-7" />
          </div>
          <CardTitle>{isSkipMode ? t('skipTitle') : t('title')}</CardTitle>
          <CardDescription>{isSkipMode ? t('skipDescription') : t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {message && (
            <div className="rounded-2xl bg-muted px-4 py-3 text-center text-sm">{message}</div>
          )}
          {isSkipMode ? (
            <>
              <Button
                disabled={isPending}
                onClick={skip}
                variant="destructive"
                className="h-12 w-full rounded-full"
              >
                <SkipForward className="mr-2 h-4 w-4" />
                {t('skipButton')}
              </Button>
              <Button
                disabled={isPending}
                onClick={confirm}
                variant="outline"
                className="h-12 w-full rounded-full"
              >
                <Check className="mr-2 h-4 w-4" />
                {t('button')}
              </Button>
            </>
          ) : (
            <>
              <Button disabled={isPending} onClick={confirm} className="h-12 w-full rounded-full">
                <Check className="mr-2 h-4 w-4" />
                {t('button')}
              </Button>
              <Button
                disabled={isPending}
                onClick={skip}
                variant="outline"
                className="h-12 w-full rounded-full"
              >
                <SkipForward className="mr-2 h-4 w-4" />
                {t('skipButton')}
              </Button>
            </>
          )}
          <Button asChild variant="ghost" className="h-12 w-full rounded-full">
            <Link href="/app/pillo">{t('backToPillo')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
