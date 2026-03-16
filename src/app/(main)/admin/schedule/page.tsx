import { ScheduleDashboard } from './_components/schedule-dashboard';

export default async function SchedulePage() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Schedule</h2>
      </div>
      <ScheduleDashboard />
    </div>
  );
}
