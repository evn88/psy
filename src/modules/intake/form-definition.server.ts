import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  getDefaultIntakeFormSteps,
  intakeFormStepsSchema,
  type DefaultIntakeFormMessages,
  type IntakeFormSteps
} from './form-definition';
import englishMessages from '../../../messages/en.json';
import russianMessages from '../../../messages/ru.json';
import serbianMessages from '../../../messages/sr.json';
import { type AppLocale, defaultLocale, isLocale } from '@/i18n/config';

export type IntakeFormDefinition = {
  version: number;
  steps: IntakeFormSteps;
};

const defaultMessagesByLocale: Record<AppLocale, DefaultIntakeFormMessages> = {
  ru: russianMessages.IntakeWizard,
  en: englishMessages.IntakeWizard,
  sr: serbianMessages.IntakeWizard
};

const getFallbackDefinition = (locale: string): IntakeFormDefinition => {
  const normalizedLocale = isLocale(locale) ? locale : defaultLocale;

  return {
    version: 1,
    steps: getDefaultIntakeFormSteps(defaultMessagesByLocale[normalizedLocale])
  };
};

/** Возвращает опубликованную форму или безопасную стартовую структуру. */
export const getIntakeFormDefinition = async (locale: string): Promise<IntakeFormDefinition> => {
  const configuration = await prisma.intakeFormConfiguration.findUnique({
    where: { locale },
    select: { version: true, steps: true }
  });

  if (!configuration) {
    return getFallbackDefinition(locale);
  }

  const parsedSteps = intakeFormStepsSchema.safeParse(configuration.steps);
  if (!parsedSteps.success) {
    return getFallbackDefinition(locale);
  }

  return { version: configuration.version, steps: parsedSteps.data };
};

/** Сохраняет новую опубликованную версию структуры анкеты. */
export const saveIntakeFormDefinition = async (locale: string, steps: IntakeFormSteps) => {
  return prisma.intakeFormConfiguration.upsert({
    where: { locale },
    create: {
      locale,
      version: 1,
      steps: steps as unknown as Prisma.InputJsonValue
    },
    update: {
      version: { increment: 1 },
      steps: steps as unknown as Prisma.InputJsonValue
    },
    select: { version: true }
  });
};
