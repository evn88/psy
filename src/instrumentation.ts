export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startPilloIntakeReminderRunnerWorkflow } = await import(
      '@/lib/pillo-reminder-workflow'
    );

    try {
      await startPilloIntakeReminderRunnerWorkflow();
    } catch (error: unknown) {
      console.error('[Instrumentation] Error starting Pillo workflow', error);
    }
  }
}
