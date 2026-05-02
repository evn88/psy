import { getTranslations } from 'next-intl/server';

import { PilloLoader } from './_components/pillo-loader';

/**
 * Loader сегмента Pillo во время загрузки маршрута.
 * @returns Экран загрузки Pillo.
 */
const Loading = async () => {
  const t = await getTranslations('Pillo');

  return <PilloLoader title={t('loading.title')} description={t('loading.description')} />;
};

export default Loading;
