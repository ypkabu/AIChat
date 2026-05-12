import { LorebookEditor } from "@/components/lorebook/LorebookEditor";

export default async function LorebookDetailPage({ params }: { params: Promise<{ lorebookId: string }> }) {
  const { lorebookId } = await params;
  return <LorebookEditor lorebookId={lorebookId} />;
}
