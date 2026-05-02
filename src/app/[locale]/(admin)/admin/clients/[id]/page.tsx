import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { decryptData } from '@/lib/crypto';
import { ClientNotes } from './_components/ClientNotes';
import { ClientIntakes } from './_components/ClientIntakes';
import { ClientDocuments } from './_components/ClientDocuments';
import { ClientData } from './_components/ClientData';
import { ClientPayments } from './_components/ClientPayments';

export default async function AdminClientProfilePage({
  params
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations('Admin.clients.dashboard');

  const [user, documents] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        clientProfile: {
          include: {
            intakes: {
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        consents: true,
        loginHistory: {
          orderBy: { createdAt: 'desc' },
          take: 5
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
    })
  ]);

  if (!user) {
    notFound();
  }

  // Parse Metadata & Decrypt Notes if present
  let notesMarkdown = '';
  if (user.clientProfile?.metadata) {
    const meta = user.clientProfile.metadata as any;
    if (meta.encryptedNotes) {
      try {
        const decryptedStr = decryptData(meta.encryptedNotes);
        const parsed = JSON.parse(decryptedStr);
        notesMarkdown = parsed.markdown || '';
      } catch (e) {
        console.error('Failed to parse notes:', e);
      }
    } else if (meta.notes) {
      // Legacy support for non-encrypted
      notesMarkdown = meta.notes;
    }
  }

  // Decrypt intakes
  const decryptedIntakes = (user.clientProfile?.intakes || []).map((intake: any) => {
    let plainAnswers = {};
    try {
      plainAnswers = JSON.parse(decryptData(intake.answers));
    } catch (e) {
      console.error('Failed to decrypt intake id:', intake.id);
    }
    return {
      ...intake,
      plainAnswers
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{user.name || 'Без имени'}</h2>
        <p className="text-muted-foreground">{user.email}</p>
      </div>

      <Tabs defaultValue="intakes" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="intakes">{t('tabs.intakes')}</TabsTrigger>
          <TabsTrigger value="notes">{t('tabs.notes')}</TabsTrigger>
          <TabsTrigger value="documents">Документы</TabsTrigger>
          <TabsTrigger value="payments">Платежи</TabsTrigger>
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

        <TabsContent value="data">
          <ClientData user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
