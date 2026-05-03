import type { PilloIntakeStatus } from '@prisma/client';

export type PilloMedicationView = {
  id: string;
  name: string;
  photoUrl: string | null;
  description: string | null;
  dosage: string | null;
  dosageValue: number | null;
  dosageUnit: string | null;
  form: string;
  packagesCount: number;
  unitsPerPackage: number | null;
  stockUnits: number;
  minThresholdUnits: number;
  isActive: boolean;
  stockStatus: 'enough' | 'low' | 'empty';
  daysLeft: number | null;
  buyAtDate: string | null;
  stockEndsAt: string | null;
};

export type PilloMedicationRecord = {
  id: string;
  name: string;
  photoUrl: string | null;
  description: string | null;
  dosage: string | null;
  dosageValue: number | null;
  dosageUnit: string | null;
  form: string;
  packagesCount: number;
  unitsPerPackage: number | null;
  stockUnits: number;
  minThresholdUnits: number;
  isActive: boolean;
};

export type PilloScheduleRuleView = {
  id: string;
  medicationId: string;
  medicationName: string;
  medicationPhotoUrl: string | null;
  time: string;
  doseUnits: number;
  daysOfWeek: number[];
  startDate: string;
  endDate: string | null;
  comment: string | null;
  isActive: boolean;
};

export type PilloIntakeRecord = {
  id: string;
  medicationId: string;
  medicationName: string;
  medicationDosage: string;
  medicationPhotoUrl: string | null;
  scheduledFor: string;
  localDate: string;
  localTime: string;
  doseUnits: number;
  status: PilloIntakeStatus;
  comment: string | null;
  medicationStockUnits: number;
  medicationMinThresholdUnits: number;
};

export type PilloIntakeView = {
  id: string;
  medicationId: string;
  medicationName: string;
  medicationDosage: string;
  medicationPhotoUrl: string | null;
  scheduledFor: string;
  localDate: string;
  localTime: string;
  doseUnits: number;
  status: PilloIntakeStatus;
  comment: string | null;
  stockUnits: number;
  minThresholdUnits: number;
  stockStatus: 'enough' | 'low' | 'empty';
  daysLeft: number | null;
  buyAtDate: string | null;
  stockEndsAt: string | null;
};

export type PilloHistoryEntryView = {
  id: string;
  medicationId: string;
  medicationName: string;
  medicationDosage: string;
  medicationPhotoUrl: string | null;
  doseUnits: number;
  takenAt: string;
  localDate: string;
  localTime: string;
  source: 'manual' | 'scheduled';
};

export type PilloWeeklyScheduledIntakeView = {
  id: string;
  medicationId: string;
  medicationName: string;
  medicationDosage: string;
  medicationPhotoUrl: string | null;
  scheduledFor: string;
  localDate: string;
  localTime: string;
  doseUnits: number;
  status: PilloIntakeStatus;
};

export type PilloPagePayload = {
  appearanceSettings: PilloAppearanceSettingsView;
  currentLocalDate: string;
  historyEntries: PilloHistoryEntryView[];
  medications: PilloMedicationRecord[];
  referenceDateIso: string;
  scheduleRules: PilloScheduleRuleView[];
  settings: PilloSettingsView;
  todayIntakes: PilloIntakeRecord[];
  weeklyScheduledIntakes: PilloWeeklyScheduledIntakeView[];
};

export type PilloSettingsView = {
  emailRemindersEnabled: boolean;
  pushRemindersEnabled: boolean;
  lowStockEmailEnabled: boolean;
  lowStockPushEnabled: boolean;
  lowStockWarningDays: number;
};

export type PilloAppearanceSettingsView = {
  language: string;
  theme: string;
};

export type PilloTab = 'home' | 'medications' | 'schedule' | 'settings';
