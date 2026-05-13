import { ScenarioDetailScreen } from "@/components/scenario/ScenarioDetailScreen";

export default async function ScenarioDetailPage({ params }: { params: Promise<{ scenarioId: string }> }) {
  const { scenarioId } = await params;
  return <ScenarioDetailScreen scenarioId={scenarioId} />;
}
