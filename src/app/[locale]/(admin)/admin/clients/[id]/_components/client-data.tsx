'use client';

import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Calendar,
  CheckCircle2,
  Fingerprint,
  Globe,
  Info,
  Languages,
  Loader2,
  MinusCircle,
  ShieldCheck,
  Trash2,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  deleteClientConsent,
  getClientConsentSignature,
  getClientConsentVerificationStatuses
} from '../../_actions/clients.actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

interface Consent {
  id: string;
  type: string;
  agreedAt: string;
  ip?: string | null;
  userAgent?: string | null;
  intakeNumber?: number | null;
}

interface ConsentPresentation {
  title: string;
  details: string | null;
  intakeLabel: string | null;
}

type ConsentVerificationStatus = 'VALID' | 'INVALID' | 'UNVERIFIABLE';

interface ClientDataProps {
  user: {
    id: string;
    createdAt: string;
    language: string;
    theme: string;
    timezone: string | null;
    lastLogin?: { timestamp: string; ip: string | null; userAgent: string | null } | null;
    consents: Consent[];
  };
}

/**
 * Компонент для отображения базовых данных клиента и управления его согласиями.
 */
export function ClientData({ user }: ClientDataProps) {
  const t = useTranslations('Admin.clients.dashboard.data');
  const [verificationStatuses, setVerificationStatuses] = useState<
    Record<string, ConsentVerificationStatus>
  >({});
  const [isVerifying, startVerification] = useTransition();
  const consentIds = user.consents.map(consent => consent.id).join(',');

  useEffect(() => {
    if (!consentIds) {
      return;
    }

    startVerification(async () => {
      const result = await getClientConsentVerificationStatuses(consentIds.split(','));
      if (result.success) {
        setVerificationStatuses(result.statuses);
      }
    });
  }, [consentIds]);

  const getConsentPresentation = (consent: Consent): ConsentPresentation => {
    const intakeConsentMatch = /^INTAKE_FORM_SUBMIT:([a-z]{2}):v(\d+)$/.exec(consent.type);
    const intakeLabel = consent.intakeNumber
      ? t('intakeNumber', { number: consent.intakeNumber })
      : null;

    if (intakeConsentMatch) {
      return {
        title: t('intakeConsentTitle'),
        details: t('intakeConsentDetails', {
          locale: intakeConsentMatch[1].toUpperCase(),
          version: intakeConsentMatch[2]
        }),
        intakeLabel
      };
    }

    if (consent.type === 'INTAKE_SUBMIT') {
      return {
        title: t('legacyIntakeConsentTitle'),
        details: t('legacyIntakeConsentDetails'),
        intakeLabel
      };
    }

    return { title: consent.type, details: null, intakeLabel };
  };

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
            {user.lastLogin && (
              <DataItem
                icon={<Globe className="h-4 w-4 text-muted-foreground" />}
                label="Последний вход"
                value={`${new Date(user.lastLogin.timestamp).toLocaleString('ru-RU')} ${user.lastLogin.ip ? `(${user.lastLogin.ip})` : ''}`}
              />
            )}
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
                <ConsentRow
                  key={consent.id}
                  consent={consent}
                  presentation={getConsentPresentation(consent)}
                  verificationStatus={verificationStatuses[consent.id]}
                  isVerifying={isVerifying}
                />
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

const ConsentRow = ({
  consent,
  presentation,
  verificationStatus,
  isVerifying
}: {
  consent: Consent;
  presentation: ConsentPresentation;
  verificationStatus?: ConsentVerificationStatus;
  isVerifying: boolean;
}) => {
  const t = useTranslations('Admin.clients.dashboard.data');

  return (
    <div className="group flex items-center justify-between p-4 px-6 transition-colors hover:bg-muted/30">
      <ConsentSignatureDialog consent={consent} presentation={presentation} />
      <div className="flex items-center gap-2">
        {isVerifying && !verificationStatus ? (
          <Loader2
            className="size-4 animate-spin text-muted-foreground"
            aria-label={t('signatureVerifying')}
          />
        ) : verificationStatus ? (
          <VerificationStatus status={verificationStatus} compact />
        ) : (
          <VerificationStatus status="UNVERIFIABLE" compact />
        )}
        <DeleteConsentButton consentId={consent.id} />
      </div>
    </div>
  );
};

const ConsentSignatureDialog = ({
  consent,
  presentation
}: {
  consent: Consent;
  presentation: ConsentPresentation;
}) => {
  const t = useTranslations('Admin.clients.dashboard.data');
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [details, setDetails] = useState<{
    type: string;
    signature: string;
    agreedAt: Date;
    ip: string | null;
    userAgent: string | null;
  } | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<
    'VALID' | 'INVALID' | 'UNVERIFIABLE' | null
  >(null);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen || details) return;

    startTransition(async () => {
      const result = await getClientConsentSignature(consent.id);
      if (result.success && result.consent && result.verification) {
        setDetails(result.consent);
        setVerificationStatus(result.verification.status);
      } else {
        toast.error(result.error || t('signatureLoadError'));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-auto justify-start p-0 text-left hover:bg-transparent">
          <ConsentSummary consent={consent} presentation={presentation} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('signatureTitle')}</DialogTitle>
          <DialogDescription>{presentation.title}</DialogDescription>
        </DialogHeader>
        {isPending ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : details ? (
          <div className="space-y-4 text-sm">
            {verificationStatus && <VerificationStatus status={verificationStatus} />}
            <DetailRow label={t('signatureConsentType')} value={details.type} />
            <DetailRow
              label={t('signatureAgreedAt')}
              value={new Date(details.agreedAt).toLocaleString('ru-RU')}
            />
            <DetailRow label={t('signatureIp')} value={details.ip || '—'} />
            <DetailRow label={t('signatureUserAgent')} value={details.userAgent || '—'} />
            <DetailRow label={t('signatureValue')} value={details.signature} isMonospace />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

const ConsentSummary = ({
  consent,
  presentation
}: {
  consent: Consent;
  presentation: ConsentPresentation;
}) => (
  <span className="block space-y-1">
    <span className="block text-sm font-medium underline-offset-4 hover:underline">
      {presentation.title}
    </span>
    {presentation.details && (
      <span className="block text-xs text-muted-foreground">{presentation.details}</span>
    )}
    {presentation.intakeLabel && (
      <span className="block text-xs font-medium text-primary">{presentation.intakeLabel}</span>
    )}
    <span className="flex items-center gap-3 text-xs text-muted-foreground">
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
    </span>
  </span>
);

const VerificationStatus = ({
  status,
  compact = false
}: {
  status: ConsentVerificationStatus;
  compact?: boolean;
}) => {
  const t = useTranslations('Admin.clients.dashboard.data');
  const label =
    status === 'VALID'
      ? t('signatureValid')
      : status === 'INVALID'
        ? t('signatureInvalid')
        : t('signatureUnverifiable');
  const icon =
    status === 'VALID' ? (
      <CheckCircle2 className={compact ? 'size-3.5' : 'mr-1 size-3.5'} aria-hidden />
    ) : status === 'INVALID' ? (
      <XCircle className={compact ? 'size-3.5' : 'mr-1 size-3.5'} aria-hidden />
    ) : (
      <MinusCircle className={compact ? 'size-3.5' : 'mr-1 size-3.5'} aria-hidden />
    );
  const className =
    status === 'VALID'
      ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
      : status === 'INVALID'
        ? 'border-destructive/30 bg-destructive/15 text-destructive'
        : 'border-border bg-muted text-muted-foreground';

  return (
    <Badge className={className} title={label} aria-label={label}>
      {icon}
      {compact ? <span className="sr-only">{label}</span> : label}
    </Badge>
  );
};

const DetailRow = ({
  label,
  value,
  isMonospace = false
}: {
  label: string;
  value: string;
  isMonospace?: boolean;
}) => (
  <div className="space-y-1.5">
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p
      className={
        isMonospace
          ? 'break-all rounded-md bg-muted p-3 font-mono text-xs leading-relaxed'
          : 'break-words'
      }
    >
      {value}
    </p>
  </div>
);

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
