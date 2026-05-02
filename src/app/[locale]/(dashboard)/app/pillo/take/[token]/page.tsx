import type { Metadata } from 'next';

import { requirePilloUser } from '@/modules/pillo/access';
import { TakeConfirmation } from './_components/take-confirmation';

export const metadata: Metadata = {
  title: 'Pillo',
  robots: {
    index: false,
    follow: false
  }
};

interface TakePageProps {
  params: Promise<{ token: string }>;
}

/**
 * Страница подтверждения приёма по ссылке из email или push.
 * @param props - параметры маршрута.
 * @returns Карточка подтверждения.
 */
const PilloTakePage = async ({ params }: TakePageProps) => {
  await requirePilloUser();
  const { token } = await params;

  return <TakeConfirmation token={token} />;
};

export default PilloTakePage;
