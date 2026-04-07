import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { AI_MODEL_CATALOG, AI_MODEL_IDS } from '@/shared/lib/ai/ai-model-catalog';
import { AI_SKILL_IDS, AI_SKILL_MANIFEST } from '@/shared/lib/ai/ai-skill-manifest';

/**
 * Проверяет, что текущий пользователь является администратором.
 *
 * @returns `true`, если запрос выполняет администратор.
 */
const isAdminRequest = async () => {
  const session = await auth();
  return Boolean(session?.user && (session.user as { role?: string }).role === 'ADMIN');
};

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    skills: AI_SKILL_IDS.map(skillId => AI_SKILL_MANIFEST[skillId]),
    models: AI_MODEL_IDS.map(modelId => AI_MODEL_CATALOG[modelId])
  });
}
