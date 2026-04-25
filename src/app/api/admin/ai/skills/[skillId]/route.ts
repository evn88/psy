import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { auth } from '@/auth';
import { aiSkillExecuteRequestSchema } from '@/shared/lib/ai/ai-contracts';
import {
  AiSkillConfigurationError,
  AiSkillNotFoundError,
  AiSkillPromptOverrideError
} from '@/shared/lib/ai/ai-errors';
import { executeAiSkill } from '@/shared/lib/ai/execute-ai-skill.server';
import { aiSkillIdSchema } from '@/shared/lib/ai/ai-skill-manifest';
import { withApiLogging } from '@/shared/lib/system-logs/with-api-logging.server';

/**
 * Проверяет, что текущий пользователь является администратором.
 *
 * @returns `true`, если запрос выполняет администратор.
 */
const isAdminRequest = async () => {
  const session = await auth();
  return Boolean(session?.user && (session.user as { role?: string }).role === 'ADMIN');
};

async function postHandler(req: Request, { params }: { params: Promise<{ skillId: string }> }) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { skillId: rawSkillId } = await params;
    const skillId = aiSkillIdSchema.parse(rawSkillId);
    const body = await req.json();
    const request = aiSkillExecuteRequestSchema.parse(body);
    const data = await executeAiSkill(skillId, request);

    return NextResponse.json({ skillId, data });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные для AI-навыка', details: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof AiSkillNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof AiSkillPromptOverrideError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof AiSkillConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json({ error: 'Не удалось выполнить AI-навык' }, { status: 500 });
  }
}

export const POST = withApiLogging(postHandler);
