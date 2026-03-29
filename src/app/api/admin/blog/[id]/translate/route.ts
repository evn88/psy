import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/shared/lib/prisma';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const schema = z.object({
  targetLocale: z.enum(['en', 'sr'])
});

const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  sr: 'Serbian (Latin script)'
};

function buildSystemPrompt(targetLocale: string): string {
  return `You are a professional translator specializing in psychology and therapy content.
Translate the following Markdown text from Russian to ${LOCALE_NAMES[targetLocale] ?? targetLocale}.
Preserve all Markdown formatting exactly: headings (#, ##, ###), bold (**text**), italic (*text*), code blocks (\`\`\`), inline code, links, lists, blockquotes, and tables.
Do not translate technical terms that are better kept in their original form (e.g. ACT, RO DBT, ADHD, ASD, Schema Therapy).
Output ONLY the translated Markdown. No explanations, no preamble.`;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверные данные' }, { status: 400 });
  }

  const { targetLocale } = parsed.data;

  const ruTranslation = await prisma.blogPostTranslation.findUnique({
    where: { postId_locale: { postId: id, locale: 'ru' } }
  });

  if (!ruTranslation) {
    return NextResponse.json({ error: 'Русский перевод не найден' }, { status: 404 });
  }

  if (!process.env.AI_GATEWAY_API_KEY) {
    return NextResponse.json(
      { error: 'AI Gateway не настроен. Добавьте AI_GATEWAY_API_KEY в переменные окружения.' },
      { status: 503 }
    );
  }

  const gateway = createOpenAI({
    apiKey: process.env.AI_GATEWAY_API_KEY,
    baseURL: 'https://ai-gateway.vercel.sh/v1'
  });

  const systemPrompt = buildSystemPrompt(targetLocale);

  const [titleResult, descriptionResult, contentResult] = await Promise.all([
    generateText({
      model: gateway('anthropic/claude-haiku-4-5-20251001'),
      system: systemPrompt,
      prompt: ruTranslation.title
    }),
    generateText({
      model: gateway('anthropic/claude-haiku-4-5-20251001'),
      system: systemPrompt,
      prompt: ruTranslation.description
    }),
    generateText({
      model: gateway('anthropic/claude-haiku-4-5-20251001'),
      system: systemPrompt,
      prompt: ruTranslation.content
    })
  ]);

  const title = titleResult.text.trim();
  const description = descriptionResult.text.trim();
  const content = contentResult.text.trim();

  await prisma.blogPostTranslation.upsert({
    where: { postId_locale: { postId: id, locale: targetLocale } },
    create: { postId: id, locale: targetLocale, title, description, content },
    update: { title, description, content }
  });

  return NextResponse.json({ success: true, locale: targetLocale, title, description, content });
}
