import packageJson from "../../../../../package.json";

function maskSupabaseProjectRef(url: string | undefined) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    const ref = host.split(".")[0] ?? "";
    if (ref.length <= 6) return ref || null;
    return ref.slice(-6);
  } catch {
    return null;
  }
}

export function GET() {
  return Response.json({
    appVersion: packageJson.version,
    commitHash: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? "unknown",
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME ?? process.env.BUILD_TIME ?? "unknown",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    supabaseProjectRefTail: maskSupabaseProjectRef(process.env.NEXT_PUBLIC_SUPABASE_URL)
  }, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
