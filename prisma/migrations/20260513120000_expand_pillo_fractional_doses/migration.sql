ALTER TABLE "PilloMedication"
  ALTER COLUMN "stockUnits" TYPE DECIMAL(10,4),
  ALTER COLUMN "minThresholdUnits" TYPE DECIMAL(10,4),
  ALTER COLUMN "dosageValue" TYPE DECIMAL(10,4);

ALTER TABLE "PilloScheduleRule"
  ALTER COLUMN "doseUnits" TYPE DECIMAL(10,4);

ALTER TABLE "PilloIntake"
  ALTER COLUMN "doseUnits" TYPE DECIMAL(10,4);

ALTER TABLE "PilloManualIntake"
  ALTER COLUMN "doseUnits" TYPE DECIMAL(10,4);
