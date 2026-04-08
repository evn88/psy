import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Construction, ClipboardList, CheckCircle2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { IntakeWizardModal } from './_components/intake-wizard';
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

  const profile = await prisma.clientProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      intakes: {
        where: { formId: 'intake_v1' },
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  const intakes = profile?.intakes || [];
  const isIntakeCompleted = intakes.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('dataTitle')}</h2>

      <Card className="max-w-2xl">
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
                {intakes.map((intake: any, i: number) => (
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

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5" />
            Мои файлы и тестирования
          </CardTitle>
          <CardDescription>Раздел в активной разработке</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Здесь скоро появится возможность загружать результаты анализов и проходить
            дополнительные диагностические тесты.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
