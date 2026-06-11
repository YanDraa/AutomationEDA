import { KpiCards } from "./_components/kpi-cards";
import { OpportunitiesSection } from "./_components/opportunities-section";
import { PipelineActivity } from "./_components/pipeline-activity";
import { TaskReminders } from "./_components/task-reminders";

export default function Page() {
  return (
    <div className="flex w-full max-w-full flex-col gap-4 overflow-x-hidden md:gap-6">
      <KpiCards />
      <PipelineActivity />
      <TaskReminders />
      <OpportunitiesSection />
    </div>
  );
}
