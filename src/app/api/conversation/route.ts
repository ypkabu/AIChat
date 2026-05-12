import { NextResponse } from "next/server";
import { z } from "zod";
import { nsfwAllowed } from "@/lib/contentSafety";
import { getConversationProvider } from "@/lib/ai/conversation/provider";
import { selectConversationModel } from "@/lib/ai/conversation/modelSelection";
import { fallbackFromRawText } from "@/lib/ai/conversation/schema";
import type { ConversationRequest } from "@/lib/ai/types";

const requestSchema = z.object({
  bundle: z.any(),
  session: z.any(),
  messages: z.array(z.any()),
  userInput: z.string().min(1),
  settings: z.any(),
  inputType: z.enum(["free_text", "choice_selected", "auto_continue"]).optional(),
  selectedChoice: z.object({
    label: z.string(),
    type: z.string()
  }).nullable().optional(),
  relationships: z.array(z.any()).optional(),
  lorebook: z.array(z.any()).optional(),
  memories: z.array(z.any()).optional(),
  foreshadowingItems: z.array(z.any()).optional(),
  storySummaries: z.array(z.any()).optional(),
  environmentState: z.any().nullable().optional(),
  characterStates: z.array(z.any()).optional(),
  kind: z.enum(["conversation", "smart_reply", "summary", "image_prompt", "director"]).optional(),
  usageTotalCostJpy: z.number().optional(),
  choicePreferences: z.any().nullable().optional()
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid conversation request" }, { status: 400 });
  }

  const payload = parsed.data as ConversationRequest;
  const allowed = nsfwAllowed(payload.settings.adult_confirmed, payload.settings.nsfw_chat_enabled && payload.session.nsfw_chat_enabled);
  const selection = selectConversationModel(payload, allowed);
  const provider = getConversationProvider(selection.provider, selection.model);

  try {
    const response = await provider.generateTurn({
      ...payload,
      nsfwAllowed: allowed,
      provider: selection.provider,
      model: selection.model,
      routeHint: selection.routeHint,
      kind: payload.kind ?? "conversation"
    });

    // Attach model_role + reason to usage so the store can log them
    if (response.usage) {
      response.usage.model_role = selection.modelRole;
      response.usage.reason = selection.reason;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Conversation provider failed", error);
    return NextResponse.json(
      fallbackFromRawText(
        error instanceof Error ? `会話AI接続でエラーが発生しました: ${error.message}` : "会話AI接続でエラーが発生しました。",
        {
          backend: provider.id,
          provider: selection.provider,
          model: selection.model,
          input_tokens: 0,
          output_tokens: 0,
          estimated_cost_jpy: 0
        },
        provider.id,
        error instanceof Error ? error.message : "Unknown provider error",
        "provider_error"
      )
    );
  }
}
