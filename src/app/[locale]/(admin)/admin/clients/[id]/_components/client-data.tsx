'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Fingerprint,
  Calendar,
  Globe,
  Languages,
  Palette,
  ShieldCheck,
  Trash2,
  Loader2,
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { deleteClientConsent } from '../../_actions/clients.actions';

interface Consent {
  id: string;
  type: string;
  agreedAt: Date;
  ip?: string | null;
  userAgent?: string | null;
}

interface ClientDataProps {
  user: {
    id: string;
    createdAt: Date;
    language: string;
    theme: string;
    timezone: string | null;
    consents: Consent[];
  };
}

/**
 * Компонент для отображения базовых данных клиента и управления его согласиями.
 */
export function ClientData({ user }: ClientDataProps) {
  const t = useTranslations('Admin.clients.dashboard.data');

  return (
    <div className="grid gap-6">
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/20 border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <DataItem
              icon={<Fingerprint className="h-4 w-4 text-muted-foreground" />}
              label={t('id')}
              value={user.id}
              isMono
            />
            <DataItem
              icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
              label={t('registration')}
              value={new Date(user.createdAt).toLocaleString('ru-RU')}
            />
            <DataItem
              icon={<Languages className="h-4 w-4 text-muted-foreground" />}
              label={t('prefs')}
              value={`${user.language.toUpperCase()} / ${user.theme} / ${user.timezone || '—'}`}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/20 border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t('consents')}
          </CardTitle>
          <CardDescription>{t('consentsCount', { count: user.consents.length })}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {user.consents.length > 0 ? (
            <div className="divide-y border-t">
              {user.consents.map(consent => (
                <div
                  key={consent.id}
                  className="flex items-center justify-between p-4 px-6 hover:bg-muted/30 transition-colors group"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{consent.type}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(consent.agreedAt).toLocaleString('ru-RU')}
                      </span>
                      {consent.ip && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {consent.ip}
                        </span>
                      )}
                    </div>
                  </div>
                  <DeleteConsentButton consentId={consent.id} />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">Нет активных согласий</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DataItem({
  icon,
  label,
  value,
  isMono = false
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isMono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <p
        className={`text-sm leading-none ${isMono ? 'font-mono bg-muted/50 p-1 rounded inline-block' : 'font-medium'}`}
      >
        {value}
      </p>
    </div>
  );
}

function DeleteConsentButton({ consentId }: { consentId: string }) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('Admin.clients.dashboard.data');

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteClientConsent(consentId);
      if (result.success) {
        toast.success(t('deleteSuccess'));
      } else {
        toast.error(result.error || 'Ошибка удаления');
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('deleteConfirmDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel') || 'Отмена'}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t('deleteConsent')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
