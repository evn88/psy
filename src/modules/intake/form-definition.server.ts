import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  defaultIntakeFormSteps,
  intakeFormStepsSchema,
  type IntakeFormSteps
} from './form-definition';

export type IntakeFormDefinition = {
  version: number;
  steps: IntakeFormSteps;
};

/** Возвращает опубликованную форму или безопасную стартовую структуру. */
export const getIntakeFormDefinition = async (locale: string): Promise<IntakeFormDefinition> => {
  const configuration = await prisma.intakeFormConfiguration.findUnique({
    where: { locale },
    select: { version: true, steps: true }
  });

  if (!configuration) {
    return { version: 1, steps: defaultIntakeFormSteps };
  }

  const parsedSteps = intakeFormStepsSchema.safeParse(configuration.steps);
  if (!parsedSteps.success) {
    return { version: 1, steps: defaultIntakeFormSteps };
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
