'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { signIn as webAuthnSignIn } from 'next-auth/webauthn';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { getPathname, useRouter } from '@/i18n/navigation';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';

/**
 * Определяет язык браузера пользователя и возвращает поддерживаемый locale.
 * Если язык не поддерживается — возвращает локаль по умолчанию.
 * @returns Поддерживаемая locale приложения.
 */
const detectBrowserLanguage = (): AppLocale => {
  if (typeof navigator === 'undefined') return defaultLocale;

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];

  for (const lang of languages) {
    const code = lang.split('-')[0].toLowerCase();
    if (isLocale(code)) {
      return code;
    }
  }

  return defaultLocale;
};

/**
 * Получает текущий locale из cookie NEXT_LOCALE.
 * Если cookie нет — определяет по браузеру.
 * @returns текущий locale
 */
const getCurrentLocale = (): AppLocale => {
  if (typeof document === 'undefined') return defaultLocale;

  const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
  if (match && isLocale(match[1])) return match[1];

  return detectBrowserLanguage();
};

/**
 * Устанавливает cookie NEXT_LOCALE для последующей серверной навигации.
 * @param locale - locale, которую нужно сохранить в cookie.
 */
const setLocaleCookie = (locale: AppLocale): void => {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
};

/**
 * Возвращает locale, которую нужно использовать после авторизации.
 * Приоритет: язык пользователя из профиля, затем текущая locale страницы,
 * затем cookie/язык браузера.
 * @param userLanguage - язык из профиля пользователя.
 * @param pageLocale - locale текущей страницы.
 * @returns Поддерживаемая locale для post-auth перехода.
 */
const resolvePostAuthLocale = (
  userLanguage: AppLocale | string | undefined,
  pageLocale: AppLocale | string
): AppLocale => {
  if (typeof userLanguage === 'string' && isLocale(userLanguage)) {
    return userLanguage;
  }

  if (typeof pageLocale === 'string' && isLocale(pageLocale)) {
    return pageLocale;
  }

  return getCurrentLocale();
};

/**
 * Выполняет переход в нужный раздел после авторизации с учетом locale.
 * @param role - роль пользователя.
 * @param locale - locale, с которой нужно построить URL.
 * @param router - next-intl router.
 */
const navigateToPostAuthPage = (
  role: 'ADMIN' | 'USER' | 'GUEST' | undefined,
  locale: AppLocale,
  router: ReturnType<typeof useRouter>
): void => {
  router.replace(getPostAuthPath(role), { locale });
};

const getPostAuthPath = (role: 'ADMIN' | 'USER' | 'GUEST' | undefined): string => {
  if (role === 'ADMIN') {
    return '/admin';
  }

  if (role === 'GUEST') {
    return '/my/profile';
  }

  return '/my';
};

export default function AuthPage() {
  const locale = useLocale();
  const t = useTranslations('Auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const verified = searchParams.get('verified');

    // Auto-detect and set timezone cookie
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      document.cookie = `NEXT_TIMEZONE=${tz}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore if not supported
    }

    if (verified === 'true') {
      toast.success(t('emailVerifiedSuccess'));
    }

    if (errorParam === 'UserExists') {
      setError(t('userExists'));
    } else if (errorParam === 'OAuthAccountNotLinked') {
      setError(t('oauthAccountNotLinked'));
    } else if (errorParam === 'VerificationFailed') {
      toast.error(t('verificationFailed'));
    } else if (errorParam === 'VerificationExpired') {
      toast.error(t('verificationExpired'));
    } else if (errorParam === 'AccountDisabled') {
      toast.error(t('accountDisabled'));
    }
  }, [searchParams, t]);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) {
      return;
    }

    const targetLocale = resolvePostAuthLocale(session.user.language, locale);
    setLocaleCookie(targetLocale);
    navigateToPostAuthPage(session.user.role, targetLocale, router);
  }, [locale, router, session, status]);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form States
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email: loginEmail,
        password: loginPassword,
        redirect: false
      });

      if (result?.error) {
        if (result.error.includes('EmailNotVerified')) {
          toast.error(t('emailNotVerified'));
        } else if (result.error.includes('AccountDisabled')) {
          toast.error(t('accountDisabled'));
        } else if (result.error.includes('TooManyAttempts')) {
          toast.error(t('tooManyAttempts'));
        } else {
          setError(t('invalidCredentials'));
        }
      }
    } catch {
      setError(t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const locale = getCurrentLocale();
      let detectedTimezone = 'UTC';
      try {
        detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch {
        // Fallback to UTC
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          password: registerPassword,
          locale,
          timezone: detectedTimezone
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('registrationFailed'));
      }

      // Показываем сообщение «проверьте email» вместо автологина
      setRegistrationSuccess(true);
      toast.success(t('checkEmailTitle'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setLocaleCookie(resolvePostAuthLocale(undefined, locale));
    signIn('google', {
      callbackUrl: getPathname({
        href: '/auth',
        locale: isLocale(locale) ? locale : defaultLocale
      })
    });
  };

  const handleWebAuthnSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await webAuthnSignIn('webauthn', { redirect: false });
      if (result?.error) {
        setError(t('passkeyFailed'));
      }
    } catch {
      setError(t('passkeyError'));
    } finally {
      setLoading(false);
    }
  };

  // Экран подтверждения email после регистрации
  if (registrationSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {t('checkEmailTitle')}
            </CardTitle>
            <CardDescription className="text-base">
              {t('checkEmailMessage', { email: registerEmail })}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              variant="outline"
              onClick={() => {
                setRegistrationSuccess(false);
                setActiveTab('login');
              }}
              className="mt-2"
            >
              {t('backToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-center">
            {t('title')}
          </CardTitle>
          <CardDescription className="text-center">{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">{t('loginTab')}</TabsTrigger>
              <TabsTrigger value="register">{t('registerTab')}</TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t('emailLabel')}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="m@example.com"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t('passwordLabel')}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('signingIn') : t('signInButton')}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">{t('nameLabel')}</Label>
                  <Input
                    id="register-name"
                    placeholder={t('namePlaceholder')}
                    value={registerName}
                    onChange={e => setRegisterName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">{t('emailLabel')}</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="m@example.com"
                    value={registerEmail}
                    onChange={e => setRegisterEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">{t('passwordLabel')}</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerPassword}
                    onChange={e => setRegisterPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('creatingAccount') : t('createAccount')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground border border-border shadow-sm rounded-md">
                {t('orContinueWith')}
              </span>
            </div>
          </div>

          <div
            className={`grid gap-4 ${activeTab === 'login' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}
          >
            {' '}
            <Button variant="outline" type="button" onClick={handleGoogleSignIn} className="w-full">
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                focusable="false"
                data-prefix="fab"
                data-icon="google"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                ></path>
              </svg>
              Google
            </Button>
            {activeTab === 'login' && (
              <Button
                variant="outline"
                type="button"
                onClick={handleWebAuthnSignIn}
                className="w-full"
                disabled={loading}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Passkey
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
