'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { signIn as webAuthnSignIn } from 'next-auth/webauthn';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';

/**
 * Определяет язык браузера пользователя и возвращает поддерживаемый locale.
 * Если язык не поддерживается — возвращает 'en' по умолчанию.
 * @returns 'en' | 'ru'
 */
const detectBrowserLanguage = (): 'en' | 'ru' => {
  if (typeof navigator === 'undefined') return 'en';

  const supportedLocales: string[] = ['en', 'ru'];
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];

  for (const lang of languages) {
    const code = lang.split('-')[0].toLowerCase();
    if (supportedLocales.includes(code)) {
      return code as 'en' | 'ru';
    }
  }

  return 'en';
};

/**
 * Сохраняет язык пользователя в БД и устанавливает cookie NEXT_LOCALE.
 * Вызывается после успешной авторизации или регистрации.
 * @param locale - определённый или выбранный locale
 */
const applyUserLanguage = async (locale: 'en' | 'ru'): Promise<void> => {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;

  try {
    await fetch('/api/settings/language', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: locale })
    });
  } catch {
    // Не критично — cookie уже установлено
  }
};

export default function AuthPage() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

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
        setError(t('invalidCredentials'));
      } else {
        const detectedLocale = detectBrowserLanguage();
        await applyUserLanguage(detectedLocale);
        router.push('/admin');
        router.refresh();
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          password: registerPassword
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('registrationFailed'));
      }

      // Auto login after registration
      await signIn('credentials', {
        email: registerEmail,
        password: registerPassword,
        redirect: false
      });

      const detectedLocale = detectBrowserLanguage();
      await applyUserLanguage(detectedLocale);

      router.push('/admin');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    const detectedLocale = detectBrowserLanguage();
    document.cookie = `NEXT_LOCALE=${detectedLocale}; path=/; max-age=31536000; SameSite=Lax`;
    signIn('google', { callbackUrl: '/admin' });
  };

  const handleWebAuthnSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await webAuthnSignIn('webauthn', { redirect: false });
      if (result?.error) {
        setError(t('passkeyFailed'));
      } else {
        const detectedLocale = detectBrowserLanguage();
        await applyUserLanguage(detectedLocale);
        router.push('/admin');
        router.refresh();
      }
    } catch {
      setError(t('passkeyError'));
    } finally {
      setLoading(false);
    }
  };

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

          <div className={`grid gap-4 ${activeTab === 'login' ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
