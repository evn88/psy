import prisma from '@/shared/lib/prisma';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { decryptData } from '@/shared/lib/crypto';
import { ClientNotes } from './_components/client-notes';
import { ClientIntakes } from './_components/client-intakes';

export default async function AdminClientProfilePage({
  params
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations('Admin.clients.dashboard');

  const user = await prisma.user.findUnique({
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
  });

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

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Базовые данные профиля</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">ID</p>
                  <p className="font-mono">{user.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Регистрация</p>
                  <p>{new Date(user.createdAt).toLocaleString('ru-RU')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Язык / Тема / Таймзона</p>
                  <p>
                    {user.language} / {user.theme} / {user.timezone || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    Согласия (Подписано документов: {user.consents.length})
                  </p>
                  <div className="space-y-1 mt-1">
                    {user.consents.map((c: any) => (
                      <p key={c.id} className="text-xs text-muted-foreground">
                        {c.type} — {new Date(c.agreedAt).toLocaleString('ru-RU')}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
