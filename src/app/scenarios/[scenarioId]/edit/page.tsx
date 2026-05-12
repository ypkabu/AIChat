import { ScenarioEditor } from "@/components/scenario/ScenarioEditor";

export default async function ScenarioEditPage({ params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params;
  return <ScenarioEditor scenarioId={scenarioId} />;
}
