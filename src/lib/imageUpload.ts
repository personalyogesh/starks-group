"use client";

function isHeicLike(file: File) {
  const t = (file.type || "").toLowerCase();
  const n = (file.name || "").toLowerCase();
  return t === "image/heic" || t === "image/heif" || n.endsWith(".heic") || n.endsWith(".heif");
}

export async function normalizeImageFileForWeb(file: File): Promise<File> {
  if (!isHeicLike(file)) return file;
  if (typeof window === "undefined") return file;

  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.85,
  });

  const blob = Array.isArray(out) ? out[0] : out;
  const nextName = file.name.replace(/\.(heic|heif)$/i, ".jpg") || "image.jpg";
  return new File([blob as BlobPart], nextName, { type: "image/jpeg" });
}

