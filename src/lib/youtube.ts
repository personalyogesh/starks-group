"use client";

export function extractYouTubeVideoId(input: string): string | null {
  const s = (input ?? "").trim();
  if (!s) return null;

  // If user pastes a raw ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;

  let url: URL | null = null;
  try {
    url = new URL(s);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  // youtu.be/<id>
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    // youtube.com/watch?v=<id>
    const v = url.searchParams.get("v");
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

    // youtube.com/embed/<id>
    // youtube.com/shorts/<id>
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "embed" || p === "shorts");
    if (idx >= 0) {
      const id = parts[idx + 1] ?? "";
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
  }

  return null;
}

