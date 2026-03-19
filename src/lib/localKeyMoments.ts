import "server-only";

import { readdir } from "fs/promises";
import path from "path";

type KeyMomentMetadata = {
  title?: string;
  caption?: string;
};

export type KeyMomentImage = {
  id: string;
  year: string;
  title: string;
  caption: string;
  src: string;
};

export type KeyMomentYearGroup = {
  year: string;
  images: KeyMomentImage[];
};

const KEY_MOMENT_LABEL_OVERRIDES: Record<string, KeyMomentMetadata> = {};

const MAX_IMAGES_PER_YEAR = 4;

const GENERIC_TITLES = [
  "Cricket Moment",
  "Matchday Memory",
  "Club Chronicle",
  "On-Field Frame",
  "Starks Archive",
  "Game Day Detail",
  "Cricket Story",
  "Season Memory",
];

const GENERIC_CAPTIONS = [
  "A curated cricket moment from the Starks archive.",
  "A polished frame from the club's visual archive.",
  "One of the timeless images from the Starks collection.",
  "A refined matchday memory from the club archive.",
  "Part of the Starks cricket story in pictures.",
];

const SUPPORTED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".heic"]);

function stableHash(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function genericTitle(year: string, fileName: string) {
  const label = GENERIC_TITLES[stableHash(`${year}:${fileName}`) % GENERIC_TITLES.length];
  return `${year} ${label}`;
}

function genericCaption(year: string, fileName: string) {
  const label = GENERIC_CAPTIONS[stableHash(`${fileName}:${year}`) % GENERIC_CAPTIONS.length];
  return label.replace("the season", `the ${year} season`);
}

function displayMetadata(year: string, fileName: string): Required<KeyMomentMetadata> {
  const override = KEY_MOMENT_LABEL_OVERRIDES[`${year}/${fileName}`] ?? {};
  if (override.title && override.caption) {
    return { title: override.title, caption: override.caption };
  }

  return {
    title: override.title ?? genericTitle(year, fileName),
    caption: override.caption ?? genericCaption(year, fileName),
  };
}

function imageSortValue(fileName: string) {
  const parts = fileName.match(/(\d+)/g);
  return parts?.length ? Number(parts[parts.length - 1]) : Number.MAX_SAFE_INTEGER;
}

export async function getLocalKeyMomentYears(): Promise<KeyMomentYearGroup[]> {
  const rootDirectory = path.join(process.cwd(), "public", "key-moments");

  try {
    const yearEntries = await readdir(rootDirectory, { withFileTypes: true });
    const yearDirectories = yearEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => Number(b) - Number(a));

    const yearGroups = await Promise.all(
      yearDirectories.map(async (year) => {
        const yearDirectory = path.join(rootDirectory, year);
        const files = await readdir(yearDirectory, { withFileTypes: true });
        const images = files
          .filter((file) => file.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(file.name).toLowerCase()))
          .sort((a, b) => imageSortValue(a.name) - imageSortValue(b.name))
          .slice(0, MAX_IMAGES_PER_YEAR)
          .map((file) => {
            const metadata = displayMetadata(year, file.name);
            return {
              id: `${year}-${file.name}`,
              year,
              title: metadata.title,
              caption: metadata.caption,
              src: `/key-moments/${year}/${encodeURIComponent(file.name)}`,
            } satisfies KeyMomentImage;
          });

        return { year, images };
      }),
    );

    return yearGroups.filter((group) => group.images.length > 0);
  } catch {
    return [];
  }
}
