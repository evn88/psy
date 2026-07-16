import { getTranslations } from 'next-intl/server';
import { BreadcrumbSetter } from '@/components/breadcrumb-setter';
import { getIntakeFormDefinition } from '@/modules/intake/form-definition.server';
import { IntakeFormEditor } from './_components/intake-form-editor';

interface AdminIntakePageProps {
  params: Promise<{ locale: string }>;
}

/** Страница управления вопросами первичной анкеты. */
export default async function AdminIntakePage({ params }: AdminIntakePageProps) {
  const { locale } = await params;
  const t = await getTranslations('AdminIntake');
  const definition = await getIntakeFormDefinition(locale);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <BreadcrumbSetter segment="intake" title={t('title')} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
      </div>
      <IntakeFormEditor
        locale={locale}
        initialSteps={definition.steps}
        version={definition.version}
      />
    </div>
  );
}
