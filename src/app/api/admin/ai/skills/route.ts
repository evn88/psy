import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { AI_MODEL_CATALOG, AI_MODEL_IDS } from '@/modules/ai/ai-model-catalog';
import { AI_SKILL_IDS, AI_SKILL_MANIFEST } from '@/modules/ai/ai-skill-manifest';
import { withApiLogging } from '@/modules/system-logs/with-api-logging.server';

/**
 * Проверяет, что текущий пользователь является администратором.
 *
 * @returns `true`, если запрос выполняет администратор.
 */
const isAdminRequest = async () => {
  const session = await auth();
  return Boolean(session?.user && (session.user as { role?: string }).role === 'ADMIN');
};

async function getHandler() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    skills: AI_SKILL_IDS.map(skillId => AI_SKILL_MANIFEST[skillId]),
    models: AI_MODEL_IDS.map(modelId => AI_MODEL_CATALOG[modelId])
  });
}

export const GET = withApiLogging(getHandler);
