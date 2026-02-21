import { getTranslations } from 'next-intl/server';
import { CreateSurveyForm } from '../_components/create-survey-form';

/**
 * Страница создания нового опроса в админке.
 */
export default async function CreateSurveyPage() {
  const t = await getTranslations('AdminSurveys');

  return (
    <div className="space-y-4">
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('createSurveyTitle')}</h2>
      <CreateSurveyForm />
    </div>
  );
}
