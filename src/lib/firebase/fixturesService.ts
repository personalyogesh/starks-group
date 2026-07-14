"use client";

import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import {
  DEFAULT_FIXTURE_YOUTUBE_URL,
  FIXTURE_SEASON_OPTIONS,
  MEGA_SMASH_2026_OFFICIAL_SCHEDULE,
  STARKS_2026_FIXTURE_TEMPLATES,
  type FixtureSeasonKey,
} from "@/data/starksFixtures2026";
import { db, isFirebaseConfigured, storage } from "@/lib/firebaseClient";

export type FixtureStatus = "scheduled" | "live" | "completed" | "postponed";
export type FixtureVenueType = "home" | "away" | "neutral";
export type FixtureResultOutcome = "unknown" | "win" | "loss" | "tie";

export type Fixture = {
  id: string;
  seasonKey: FixtureSeasonKey;
  seasonLabel: string;
  seasonYear: number;
  gameNumber: number;
  homeTeam: string;
  awayTeam: string;
  opponent: string;
  date: Timestamp | null;
  venue: string;
  location: string;
  venueType: FixtureVenueType;
  status: FixtureStatus;
  isPublic: boolean;
  liveScoreUrl: string;
  youtubeUrl: string;
  resultText: string;
  resultOutcome: FixtureResultOutcome;
  mvp: string;
  mvpImageUrl: string;
  mvpImageStoragePath: string;
  heroImageUrl: string;
  heroImageStoragePath: string;
  notes: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

type CreateFixtureInput = Omit<Fixture, "id" | "createdAt" | "updatedAt">;
type UpdateFixtureInput = Partial<Omit<Fixture, "id" | "createdAt" | "updatedAt">>;

function toTimestamp(value: unknown): Timestamp | null {
  if (value && typeof value === "object" && "toMillis" in value) {
    return value as Timestamp;
  }
  return null;
}

function toFixtureStatus(value: unknown): FixtureStatus {
  return value === "live" || value === "completed" || value === "postponed" ? value : "scheduled";
}

function toVenueType(value: unknown): FixtureVenueType {
  return value === "away" || value === "neutral" ? value : "home";
}

function toResultOutcome(value: unknown): FixtureResultOutcome {
  return value === "win" || value === "loss" || value === "tie" ? value : "unknown";
}

function toSeasonKey(value: unknown): FixtureSeasonKey {
  return value === "mega-smash-2026" || value === "playoffs-2026" ? value : "mega-bash-2026";
}

function toSeasonLabel(seasonKey: FixtureSeasonKey, raw: unknown): string {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return FIXTURE_SEASON_OPTIONS.find((item) => item.key === seasonKey)?.label ?? "Mega Bash 2026";
}

function normalizeFixture(id: string, data: Record<string, unknown>): Fixture {
  const seasonKey = toSeasonKey(data.seasonKey);
  return {
    id,
    seasonKey,
    seasonLabel: toSeasonLabel(seasonKey, data.seasonLabel),
    seasonYear: Number(data.seasonYear ?? 2026),
    gameNumber: Number(data.gameNumber ?? 0),
    homeTeam: String(data.homeTeam ?? "Starks"),
    awayTeam: String(data.awayTeam ?? data.opponent ?? "Opponent"),
    opponent: String(data.opponent ?? data.awayTeam ?? "Opponent"),
    date: toTimestamp(data.date),
    venue: String(data.venue ?? ""),
    location: String(data.location ?? ""),
    venueType: toVenueType(data.venueType),
    status: toFixtureStatus(data.status),
    isPublic: Boolean(data.isPublic ?? false),
    liveScoreUrl: String(data.liveScoreUrl ?? ""),
    youtubeUrl: String(data.youtubeUrl ?? ""),
    resultText: String(data.resultText ?? ""),
    resultOutcome: toResultOutcome(data.resultOutcome),
    mvp: String(data.mvp ?? ""),
    mvpImageUrl: String(data.mvpImageUrl ?? ""),
    mvpImageStoragePath: String(data.mvpImageStoragePath ?? ""),
    heroImageUrl: String(data.heroImageUrl ?? ""),
    heroImageStoragePath: String(data.heroImageStoragePath ?? ""),
    notes: String(data.notes ?? ""),
    createdAt: toTimestamp(data.createdAt),
    updatedAt: toTimestamp(data.updatedAt),
  };
}

function seasonSortValue(seasonKey: FixtureSeasonKey) {
  if (seasonKey === "mega-bash-2026") return 0;
  if (seasonKey === "mega-smash-2026") return 1;
  return 2;
}

function compareFixtures(a: Fixture, b: Fixture) {
  const seasonCompare = seasonSortValue(a.seasonKey) - seasonSortValue(b.seasonKey);
  if (seasonCompare !== 0) return seasonCompare;
  if (a.gameNumber !== b.gameNumber) return a.gameNumber - b.gameNumber;
  const aTime = a.date?.toMillis() ?? Number.MAX_SAFE_INTEGER;
  const bTime = b.date?.toMillis() ?? Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
}

export function buildFixtureMatchup(args: { venueType: FixtureVenueType; opponent: string }) {
  const opponent = args.opponent.trim() || "Opponent";
  if (args.venueType === "away") {
    return {
      homeTeam: opponent,
      awayTeam: "Starks",
    };
  }

  return {
    homeTeam: "Starks",
    awayTeam: opponent,
  };
}

async function uploadFixtureHeroImage(file: File) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const storagePath = `fixture-images/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" });
  const url = await getDownloadURL(storageRef);
  return { heroImageUrl: url, heroImageStoragePath: storagePath };
}

export async function getAllFixtures(): Promise<Fixture[]> {
  if (!isFirebaseConfigured) return [];
  const snap = await getDocs(collection(db, "fixtures"));
  return snap.docs
    .map((item) => normalizeFixture(item.id, item.data() as Record<string, unknown>))
    .sort(compareFixtures);
}

export async function getPublicFixtures(): Promise<Fixture[]> {
  if (!isFirebaseConfigured) return [];
  const snap = await getDocs(query(collection(db, "fixtures"), where("isPublic", "==", true)));
  return snap.docs
    .map((item) => normalizeFixture(item.id, item.data() as Record<string, unknown>))
    .sort(compareFixtures);
}

export function subscribeToFixtures(
  cb: (fixtures: Fixture[]) => void,
  opts?: { onError?: (error: unknown) => void },
) {
  if (!isFirebaseConfigured) {
    cb([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, "fixtures"),
    (snap) => {
      const rows = snap.docs
        .map((item) => normalizeFixture(item.id, item.data() as Record<string, unknown>))
        .sort(compareFixtures);
      cb(rows);
    },
    (error) => {
      opts?.onError?.(error);
      console.warn("[fixturesService.subscribeToFixtures] snapshot error", error);
      cb([]);
    },
  );
}

export function subscribeToPublicFixtures(
  cb: (fixtures: Fixture[]) => void,
  opts?: { onError?: (error: unknown) => void },
) {
  if (!isFirebaseConfigured) {
    cb([]);
    return () => {};
  }

  return onSnapshot(
    query(collection(db, "fixtures"), where("isPublic", "==", true)),
    (snap) => {
      const rows = snap.docs
        .map((item) => normalizeFixture(item.id, item.data() as Record<string, unknown>))
        .sort(compareFixtures);
      cb(rows);
    },
    (error) => {
      opts?.onError?.(error);
      console.warn("[fixturesService.subscribeToPublicFixtures] snapshot error", error);
      cb([]);
    },
  );
}

export async function createFixture(input: CreateFixtureInput): Promise<string> {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured.");
  const ref = await addDoc(collection(db, "fixtures"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateFixture(id: string, updates: UpdateFixtureInput): Promise<void> {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured.");
  await updateDoc(doc(db, "fixtures", id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function createFixtureWithOptionalImage(
  input: Omit<CreateFixtureInput, "heroImageUrl" | "heroImageStoragePath" | "mvpImageUrl" | "mvpImageStoragePath">,
  files?: { heroImageFile?: File | null; mvpImageFile?: File | null },
) {
  const heroImageFields = files?.heroImageFile
    ? await uploadFixtureHeroImage(files.heroImageFile)
    : { heroImageUrl: "", heroImageStoragePath: "" };
  const mvpImageFields = files?.mvpImageFile
    ? await uploadFixtureHeroImage(files.mvpImageFile).then((uploaded) => ({
        mvpImageUrl: uploaded.heroImageUrl,
        mvpImageStoragePath: uploaded.heroImageStoragePath,
      }))
    : { mvpImageUrl: "", mvpImageStoragePath: "" };

  return createFixture({
    ...input,
    ...heroImageFields,
    ...mvpImageFields,
  });
}

export async function updateFixtureWithOptionalImage(
  id: string,
  updates: Omit<UpdateFixtureInput, "heroImageUrl" | "heroImageStoragePath" | "mvpImageUrl" | "mvpImageStoragePath">,
  files?: { heroImageFile?: File | null; mvpImageFile?: File | null },
) {
  const heroImageFields = files?.heroImageFile ? await uploadFixtureHeroImage(files.heroImageFile) : {};
  const mvpImageFields = files?.mvpImageFile
    ? await uploadFixtureHeroImage(files.mvpImageFile).then((uploaded) => ({
        mvpImageUrl: uploaded.heroImageUrl,
        mvpImageStoragePath: uploaded.heroImageStoragePath,
      }))
    : {};
  await updateFixture(id, {
    ...updates,
    ...heroImageFields,
    ...mvpImageFields,
  });
}

export async function deleteFixture(id: string): Promise<void> {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured.");
  await deleteDoc(doc(db, "fixtures", id));
}

export async function seed2026Fixtures(): Promise<{ created: number; skipped: boolean }> {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured.");

  const existing = await getDocs(query(collection(db, "fixtures"), where("seasonYear", "==", 2026)));
  if (!existing.empty) {
    return { created: 0, skipped: true };
  }

  const batch = writeBatch(db);
  for (const template of STARKS_2026_FIXTURE_TEMPLATES) {
    const teams = buildFixtureMatchup({
      venueType: template.venueType,
      opponent: template.opponent,
    });

    batch.set(doc(db, "fixtures", template.id), {
      seasonKey: template.seasonKey,
      seasonLabel: template.seasonLabel,
      seasonYear: template.seasonYear,
      gameNumber: template.gameNumber,
      homeTeam: teams.homeTeam,
      awayTeam: teams.awayTeam,
      opponent: template.opponent,
      date: null,
      venue: template.venue,
      location: template.location,
      venueType: template.venueType,
      status: "scheduled",
      isPublic: false,
      liveScoreUrl: "",
      youtubeUrl: DEFAULT_FIXTURE_YOUTUBE_URL,
      resultText: "",
      resultOutcome: "unknown",
      mvp: "",
      mvpImageUrl: "",
      mvpImageStoragePath: "",
      heroImageUrl: "",
      heroImageStoragePath: "",
      notes: template.notes ?? "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
  return { created: STARKS_2026_FIXTURE_TEMPLATES.length, skipped: false };
}

export async function setSeasonFixturesVisibility(args: {
  seasonKey: FixtureSeasonKey;
  seasonYear: number;
  isPublic: boolean;
}): Promise<{ updated: number }> {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured.");
  const snap = await getDocs(
    query(
      collection(db, "fixtures"),
      where("seasonKey", "==", args.seasonKey),
      where("seasonYear", "==", args.seasonYear),
    ),
  );

  if (snap.empty) return { updated: 0 };

  const batch = writeBatch(db);
  snap.docs.forEach((fixtureDoc) => {
    batch.update(fixtureDoc.ref, {
      isPublic: args.isPublic,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
  return { updated: snap.docs.length };
}

export async function publishMegaSmashFixtures2026(): Promise<{ created: number; updated: number }> {
  if (!isFirebaseConfigured) throw new Error("Firebase isn’t configured.");

  const snap = await getDocs(
    query(collection(db, "fixtures"), where("seasonKey", "==", "mega-smash-2026"), where("seasonYear", "==", 2026)),
  );
  const existingByGame = new Map<number, { id: string }>();
  snap.docs.forEach((fixtureDoc) => {
    const data = normalizeFixture(fixtureDoc.id, fixtureDoc.data() as Record<string, unknown>);
    existingByGame.set(data.gameNumber, { id: fixtureDoc.id });
  });

  const batch = writeBatch(db);
  let created = 0;
  let updated = 0;

  for (const game of MEGA_SMASH_2026_OFFICIAL_SCHEDULE) {
    const venueType = game.starksRole === "visitor" ? "away" : "home";
    const teams = buildFixtureMatchup({
      venueType,
      opponent: game.opponent,
    });
    const gameDate = Timestamp.fromDate(new Date(2026, game.month - 1, game.day, game.hour24, game.minute, 0, 0));
    const existing = existingByGame.get(game.gameNumber);
    const fixtureRef = existing ? doc(db, "fixtures", existing.id) : doc(db, "fixtures", `mega-smash-2026-${String(game.gameNumber).padStart(2, "0")}`);
    const payload = {
      seasonKey: "mega-smash-2026",
      seasonLabel: "Mega Smash 2026",
      seasonYear: 2026,
      gameNumber: game.gameNumber,
      homeTeam: teams.homeTeam,
      awayTeam: teams.awayTeam,
      opponent: game.opponent,
      date: gameDate,
      venue: game.venue,
      location: game.location,
      venueType,
      status: "scheduled",
      isPublic: true,
      liveScoreUrl: "",
      youtubeUrl: DEFAULT_FIXTURE_YOUTUBE_URL,
      resultText: "",
      resultOutcome: "unknown",
      mvp: "",
      mvpImageUrl: "",
      mvpImageStoragePath: "",
      heroImageUrl: "",
      heroImageStoragePath: "",
      notes: "",
      updatedAt: serverTimestamp(),
    } as const;

    if (existing) {
      batch.update(fixtureRef, payload);
      updated += 1;
    } else {
      batch.set(fixtureRef, {
        ...payload,
        createdAt: serverTimestamp(),
      });
      created += 1;
    }
  }

  await batch.commit();
  return { created, updated };
}
