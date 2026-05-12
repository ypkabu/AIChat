import { createBrowserSupabaseClient } from "./client";

export type AvatarUploadTarget = {
  kind: "characters" | "user-profiles";
  id: string;
};

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateAvatarFile(file: File) {
  if (!AVATAR_MIME_TYPES.includes(file.type)) {
    return "jpg / jpeg / png / webp の画像を選んでください。";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "画像サイズは 5MB 以内にしてください。";
  }
  return null;
}

export async function uploadAvatar(file: File, target: AvatarUploadTarget) {
  const error = validateAvatarFile(file);
  if (error) throw new Error(error);

  const supabase = createBrowserSupabaseClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user) {
    return {
      avatar_url: await fileToDataUrl(file),
      avatar_storage_path: null
    };
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
  const path = `avatars/${target.kind}/${target.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type
  });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return {
    avatar_url: data.publicUrl,
    avatar_storage_path: path
  };
}

export async function uploadGeneratedImageFromUrl(imageUrl: string, userId: string, sessionId: string, imageId: string) {
  const supabase = createBrowserSupabaseClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user || user.id !== userId) {
    return {
      public_url: imageUrl,
      thumbnail_url: imageUrl,
      storage_path: null
    };
  }

  const blob = await imageUrlToBlob(imageUrl);
  const extension = mimeToExtension(blob.type);
  const path = `generated-images/${userId}/${sessionId}/${imageId}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("generated-images").upload(path, blob, {
    cacheControl: "3600",
    upsert: true,
    contentType: blob.type || "image/png"
  });

  if (uploadError) throw uploadError;

  const { data, error: signedUrlError } = await supabase.storage.from("generated-images").createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signedUrlError) throw signedUrlError;

  return {
    public_url: data.signedUrl,
    thumbnail_url: data.signedUrl,
    storage_path: path
  };
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
    reader.readAsDataURL(file);
  });
}

async function imageUrlToBlob(imageUrl: string) {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("生成画像の保存用データ取得に失敗しました。");
  return response.blob();
}

function mimeToExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/svg+xml") return "svg";
  return "png";
}

// ---------------------------------------------------------------------------
// Voice audio Storage upload
// ---------------------------------------------------------------------------

/**
 * 生成済み音声（base64 data URI）を Supabase Storage の `voice-audio` バケットに保存する。
 * バケットが存在しない、または未ログイン時は data URI をそのまま返す（localStorage fallback）。
 */
export async function uploadVoiceAudio(
  audioDataUri: string,
  userId: string,
  sessionId: string,
  jobId: string
): Promise<{ storage_path: string | null; public_url: string | null }> {
  const supabase = createBrowserSupabaseClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!supabase || !user || user.id !== userId) {
    return { storage_path: null, public_url: null };
  }

  try {
    // data:audio/mpeg;base64,XXXX → blob
    const [header, base64Data] = audioDataUri.split(",");
    if (!base64Data) return { storage_path: null, public_url: null };
    const mimeMatch = header.match(/data:([^;]+);/);
    const mimeType = mimeMatch?.[1] ?? "audio/mpeg";
    const ext = mimeType.includes("wav") ? "wav" : mimeType.includes("ogg") ? "ogg" : "mp3";

    const byteString = atob(base64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: mimeType });

    const path = `voice-audio/${userId}/${sessionId}/${jobId}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("voice-audio").upload(path, blob, {
      cacheControl: "86400",
      upsert: true,
      contentType: mimeType
    });

    if (uploadError) {
      // バケット未作成の場合は握りつぶして fallback
      console.warn("[VoiceStorage] Upload skipped:", uploadError.message);
      return { storage_path: null, public_url: null };
    }

    const { data } = supabase.storage.from("voice-audio").getPublicUrl(path);
    return { storage_path: path, public_url: data.publicUrl };
  } catch (err) {
    console.warn("[VoiceStorage] Unexpected error:", err);
    return { storage_path: null, public_url: null };
  }
}
