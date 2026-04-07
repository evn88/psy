import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { auth } from '@/auth';
import { aiModelIdSchema } from '@/shared/lib/ai/ai-model-catalog';
import { aiSkillPromptOverridesSchema } from '@/shared/lib/ai/ai-contracts';
import { AiSkillConfigurationError, AiSkillPromptOverrideError } from '@/shared/lib/ai/ai-errors';
import { executeAiSkill } from '@/shared/lib/ai/execute-ai-skill.server';
import type { BlogArticleTranslationResult } from '@/shared/lib/ai/skills/blog-article-translation.contract';
import prisma from '@/shared/lib/prisma';

const schema = z.object({
  targetLocale: z.enum(['en', 'sr']),
  modelId: aiModelIdSchema.optional(),
  overrides: aiSkillPromptOverridesSchema.optional()
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();

    if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = schema.parse(body);
    const ruTranslation = await prisma.blogPostTranslation.findUnique({
      where: { postId_locale: { postId: id, locale: 'ru' } }
    });

    if (!ruTranslation) {
      return NextResponse.json({ error: 'Русский перевод не найден' }, { status: 404 });
    }

    const translatedData = await executeAiSkill<BlogArticleTranslationResult>(
      'blog-article-translation',
      {
        input: {
          sourceLocale: 'ru',
          targetLocale: parsed.targetLocale,
          title: ruTranslation.title,
          description: ruTranslation.description,
          content: ruTranslation.content
        },
        modelId: parsed.modelId,
        overrides: parsed.overrides
      }
    );

    await prisma.blogPostTranslation.upsert({
      where: { postId_locale: { postId: id, locale: parsed.targetLocale } },
      create: {
        postId: id,
        locale: parsed.targetLocale,
        title: translatedData.title,
        description: translatedData.description,
        content: translatedData.content
      },
      update: {
        title: translatedData.title,
        description: translatedData.description,
        content: translatedData.content
      }
    });

    return NextResponse.json({
      success: true,
      locale: parsed.targetLocale,
      title: translatedData.title,
      description: translatedData.description,
      content: translatedData.content
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные', details: z.treeifyError(error) },
        { status: 400 }
      );
    }

    if (error instanceof AiSkillPromptOverrideError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof AiSkillConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json({ error: 'Не удалось выполнить перевод' }, { status: 500 });
  }
}
