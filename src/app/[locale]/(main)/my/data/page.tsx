import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, CheckCircle2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { IntakeWizardModal } from './_components/intake-wizard';
import { MyDocuments } from './_components/my-documents';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { redirect } from 'next/navigation';

export default async function MyDataPage() {
  const t = await getTranslations('My');
  const tIntake = await getTranslations('IntakeWizard');
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth');
  }

  const [profile, documents] = await Promise.all([
    prisma.clientProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        intakes: {
          where: { formId: 'intake_v1' },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    }),
    prisma.clientDocument.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        fileType: true,
        size: true,
        createdAt: true,
        uploadedById: true
      }
    })
  ]);

  const intakes = profile?.intakes || [];
  const isIntakeCompleted = intakes.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('dataTitle')}</h2>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Левая колонка — анкета */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              {tIntake('title')}
            </CardTitle>
            <CardDescription>
              {isIntakeCompleted
                ? 'Спасибо, что заполняли анкеты. Специалист изучает их перед сессиями.'
                : tIntake('description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isIntakeCompleted && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                  {tIntake('historyTitle', { fallback: 'История анкет' })}
                </h3>
                <div className="grid gap-2">
                  {intakes.map((intake: any) => (
                    <div
                      key={intake.id}
                      className="flex items-center justify-between p-3 border rounded-md bg-muted/20"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm font-medium">Анкета Intake v1</p>
                          <p className="text-xs text-muted-foreground">
                            {tIntake('completedAt', { fallback: 'Заполнена' })}:{' '}
                            {new Date(intake.createdAt).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground w-full sm:w-2/3">
                {isIntakeCompleted
                  ? 'Если ваши данные изменились, вы можете оставить новую анкету.'
                  : 'Пожалуйста, заполните анкету перед первой сессией.'}
              </div>
              <IntakeWizardModal
                triggerText={
                  isIntakeCompleted
                    ? tIntake('fillAgain', { fallback: 'Заполнить заново' })
                    : undefined
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Правая колонка — файлы */}
        <MyDocuments userId={session.user.id} documents={documents} />
      </div>
    </div>
  );
}
