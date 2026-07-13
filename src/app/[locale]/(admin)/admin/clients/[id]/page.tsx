import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { decryptData } from '@/lib/crypto';
import { ClientNotes } from './_components/client-notes';
import { ClientIntakes } from './_components/client-intakes';
import { ClientDocuments } from './_components/client-documents';
import { ClientData } from './_components/client-data';
import { ClientPayments } from './_components/client-payments';
import { ClientAvatar } from './_components/client-avatar';
import { ClientSchedule } from './_components/client-schedule';
import { ClientMessages } from './_components/client-messages';
import { BreadcrumbSetter } from '@/components/breadcrumb-setter';

type ClientIntakeRow = {
  id: string;
  formId: string;
  status: string;
  answers: string;
  createdAt: Date;
  updatedAt: Date;
};

type ClientConsentRow = {
  id: string;
  type: string;
  agreedAt: Date;
  ip: string | null;
  userAgent: string | null;
};

const getStringMetadataField = (metadata: Prisma.JsonValue, key: string) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const value = metadata[key];
  return typeof value === 'string' ? value : null;
};

const parsePlainAnswers = (encryptedAnswers: string): Record<string, unknown> => {
  const parsed = JSON.parse(decryptData(encryptedAnswers)) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  return parsed as Record<string, unknown>;
};

export default async function AdminClientProfilePage({
  params
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations('Admin.clients.dashboard');

  const [user, documents, events] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        language: true,
        theme: true,
        timezone: true,
        loginHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        clientProfile: {
          select: {
            metadata: true,
            intakes: {
              select: {
                id: true,
                formId: true,
                status: true,
                answers: true,
                createdAt: true,
                updatedAt: true
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        consents: {
          select: {
            id: true,
            type: true,
            agreedAt: true,
            ip: true,
            userAgent: true
          }
        }
      }
    }),
    prisma.clientDocument.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        fileType: true,
        size: true,
        createdAt: true,
        uploadedById: true,
        uploadedBy: { select: { name: true, email: true } }
      }
    }),
    prisma.event.findMany({
      where: { userId: id },
      orderBy: { start: 'desc' }
    })
  ]);

  if (!user) {
    notFound();
  }

  // Parse Metadata & Decrypt Notes if present
  let notesMarkdown = '';
  if (user.clientProfile?.metadata) {
    const encryptedNotes = getStringMetadataField(user.clientProfile.metadata, 'encryptedNotes');
    const legacyNotes = getStringMetadataField(user.clientProfile.metadata, 'notes');

    if (encryptedNotes) {
      try {
        const parsed = JSON.parse(decryptData(encryptedNotes)) as unknown;
        if (
          parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          typeof (parsed as Record<string, unknown>).markdown === 'string'
        ) {
          notesMarkdown = (parsed as Record<string, string>).markdown;
        }
      } catch (e) {
        console.error('Failed to parse notes:', e);
      }
    } else if (legacyNotes) {
      notesMarkdown = legacyNotes;
    }
  }

  // Decrypt intakes
  const intakes = (user.clientProfile?.intakes || []) as ClientIntakeRow[];
  const decryptedIntakes = intakes.map(intake => {
    let plainAnswers: Record<string, unknown> = {};
    try {
      plainAnswers = parsePlainAnswers(intake.answers);
    } catch (e) {
      console.error('Failed to decrypt intake id:', intake.id);
    }
    return {
      id: intake.id,
      formId: intake.formId,
      status: intake.status,
      createdAt: intake.createdAt.toISOString(),
      updatedAt: intake.updatedAt.toISOString(),
      plainAnswers
    };
  });

  const lastLogin = user.loginHistory?.[0];

  const clientData = {
    id: user.id,
    createdAt: user.createdAt.toISOString(),
    language: user.language,
    theme: user.theme,
    timezone: user.timezone,
    lastLogin: lastLogin
      ? {
          timestamp: lastLogin.createdAt.toISOString(),
          ip: lastLogin.ip,
          userAgent: lastLogin.provider
        }
      : null,
    consents: (user.consents as ClientConsentRow[]).map(consent => ({
      id: consent.id,
      type: consent.type,
      agreedAt: consent.agreedAt.toISOString(),
      ip: consent.ip,
      userAgent: consent.userAgent
    }))
  };

  const displayName = user.name || 'Без имени';

  return (
    <div className="space-y-6">
      <BreadcrumbSetter segment={user.id} title={displayName} />
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <ClientAvatar userId={user.id} name={user.name} image={user.image} />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{displayName}</h2>
          <p className="text-muted-foreground">{user.email}</p>
          {lastLogin && (
            <p className="text-xs text-muted-foreground mt-1">
              Последний вход: {new Date(lastLogin.createdAt).toLocaleString('ru-RU')}
              {lastLogin.ip && ` (IP: ${lastLogin.ip})`}
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue="intakes" className="space-y-4">
        <TabsList className="bg-muted flex-wrap h-auto">
          <TabsTrigger value="intakes">{t('tabs.intakes')}</TabsTrigger>
          <TabsTrigger value="notes">{t('tabs.notes')}</TabsTrigger>
          <TabsTrigger value="documents">Документы</TabsTrigger>
          <TabsTrigger value="payments">Платежи</TabsTrigger>
          <TabsTrigger value="schedule">Расписание</TabsTrigger>
          <TabsTrigger value="messages">Сообщения</TabsTrigger>
          <TabsTrigger value="data">{t('tabs.data')}</TabsTrigger>
        </TabsList>

        <TabsContent value="intakes" className="space-y-4">
          <ClientIntakes intakes={decryptedIntakes} />
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-xl">{t('notes.title')}</CardTitle>
              <CardDescription>{t('notes.description')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ClientNotes userId={user.id} initialMarkdown={notesMarkdown} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <ClientDocuments clientId={user.id} documents={documents} />
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <ClientPayments clientId={user.id} />
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <ClientSchedule userId={user.id} events={events} />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <ClientMessages email={user.email} />
        </TabsContent>

        <TabsContent value="data">
          <ClientData user={clientData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
