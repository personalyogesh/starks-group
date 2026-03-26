"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import { CalendarDays, Pencil, Radio, RefreshCw, ShieldCheck, Trash2, Trophy, Upload } from "lucide-react";

import { RequireAdmin } from "@/components/RequireAdmin";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import { Badge } from "@/app/components/ui/badge";
import { FIXTURE_SEASON_OPTIONS, type FixtureSeasonKey } from "@/data/starksFixtures2026";
import { useToast } from "@/components/ui/ToastProvider";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { describeFirebasePermissionDenied } from "@/lib/firebase/firebasePermissionMessage";
import {
  buildFixtureMatchup,
  createFixtureWithOptionalImage,
  deleteFixture,
  getAllFixtures,
  seed2026Fixtures,
  subscribeToFixtures,
  updateFixture,
  updateFixtureWithOptionalImage,
  type Fixture,
  type FixtureStatus,
  type FixtureVenueType,
} from "@/lib/firebase/fixturesService";
import { fixtureDate, fixtureMatchup, fixtureStatusLabel } from "@/lib/fixtures";

type FixtureFilter = "all" | FixtureStatus;

type FixtureForm = {
  seasonKey: FixtureSeasonKey;
  seasonLabel: string;
  seasonYear: number;
  gameNumber: number;
  opponent: string;
  date: string;
  venue: string;
  location: string;
  venueType: FixtureVenueType;
  status: FixtureStatus;
  isPublic: boolean;
  liveScoreUrl: string;
  youtubeUrl: string;
  resultText: string;
  mvp: string;
  notes: string;
};

const defaultSeason = FIXTURE_SEASON_OPTIONS[0];

const defaultForm: FixtureForm = {
  seasonKey: defaultSeason.key,
  seasonLabel: defaultSeason.label,
  seasonYear: 2026,
  gameNumber: 1,
  opponent: "",
  date: "",
  venue: "",
  location: "",
  venueType: "home",
  status: "scheduled",
  isPublic: false,
  liveScoreUrl: "",
  youtubeUrl: "https://www.youtube.com/@starkscricket",
  resultText: "",
  mvp: "",
  notes: "",
};

function toDateTimeLocal(value: unknown): string {
  const date = fixtureDate(value);
  if (!date) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function parseDateTimeLocal(value: string): Timestamp | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : Timestamp.fromDate(parsed);
}

function formatDate(value: unknown) {
  const date = fixtureDate(value);
  if (!date) return "Date TBD";
  return date.toLocaleString();
}

export default function AdminFixturesPage() {
  const { toast } = useToast();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FixtureFilter>("all");
  const [seasonFilter, setSeasonFilter] = useState<FixtureSeasonKey | "all">("all");
  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);
  const [form, setForm] = useState<FixtureForm>(defaultForm);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const loadFixtures = useCallback(async () => {
    setLoading(true);
    try {
      setFixtures((await getAllFixtures()).filter((fixture) => fixture.seasonYear === 2026));
    } catch (error) {
      toast({
        kind: "error",
        title: "Failed to load fixtures",
        description: describeFirebasePermissionDenied(error),
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadFixtures();
  }, [loadFixtures]);

  useEffect(() => {
    const unsubscribe = subscribeToFixtures(
      (incoming) => {
        setFixtures(incoming.filter((fixture) => fixture.seasonYear === 2026));
      },
      {
        onError: (error) => {
          toast({
            kind: "error",
            title: "Fixture access denied",
            description:
              error instanceof Error
                ? error.message
                : "Deploy the latest Firestore rules and verify your admin role.",
          });
        },
      },
    );
    return unsubscribe;
  }, [toast]);

  const stats = useMemo(() => {
    const published = fixtures.filter((fixture) => fixture.isPublic).length;
    const live = fixtures.filter((fixture) => fixture.status === "live").length;
    const completed = fixtures.filter((fixture) => fixture.status === "completed").length;
    return { total: fixtures.length, published, live, completed };
  }, [fixtures]);

  const filteredFixtures = useMemo(() => {
    const query = search.trim().toLowerCase();
    return fixtures.filter((fixture) => {
      const matchesSearch =
        !query ||
        fixture.opponent.toLowerCase().includes(query) ||
        fixture.venue.toLowerCase().includes(query) ||
        fixture.location.toLowerCase().includes(query) ||
        fixture.seasonLabel.toLowerCase().includes(query);
      const matchesFilter = filter === "all" || fixture.status === filter;
      const matchesSeason = seasonFilter === "all" || fixture.seasonKey === seasonFilter;
      return matchesSearch && matchesFilter && matchesSeason;
    });
  }, [fixtures, search, filter, seasonFilter]);

  function setField<K extends keyof FixtureForm>(key: K, value: FixtureForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(defaultForm);
    setEditingFixtureId(null);
    setImageFile(null);
  }

  function hydrateForm(fixture: Fixture) {
    setEditingFixtureId(fixture.id);
    setForm({
      seasonKey: fixture.seasonKey,
      seasonLabel: fixture.seasonLabel,
      seasonYear: fixture.seasonYear,
      gameNumber: fixture.gameNumber,
      opponent: fixture.opponent,
      date: toDateTimeLocal(fixture.date),
      venue: fixture.venue,
      location: fixture.location,
      venueType: fixture.venueType,
      status: fixture.status,
      isPublic: fixture.isPublic,
      liveScoreUrl: fixture.liveScoreUrl,
      youtubeUrl: fixture.youtubeUrl,
      resultText: fixture.resultText,
      mvp: fixture.mvp,
      notes: fixture.notes,
    });
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSeedSeason() {
    setSeeding(true);
    try {
      const result = await seed2026Fixtures();
      if (result.skipped) {
        toast({
          kind: "info",
          title: "Templates already exist",
          description: "You can edit the seeded fixtures below.",
        });
      } else {
        toast({
          kind: "success",
          title: "Season templates loaded",
          description: `Added ${result.created} draft fixtures for Mega Bash and Mega Smash 2026.`,
        });
      }
      await loadFixtures();
    } catch (error) {
      toast({
        kind: "error",
        title: "Failed to load templates",
        description: describeFirebasePermissionDenied(error),
      });
    } finally {
      setSeeding(false);
    }
  }

  async function handleSubmit() {
    if (!form.opponent.trim() || !form.venue.trim() || !form.location.trim()) {
      toast({
        kind: "error",
        title: "Missing required fields",
        description: "Please fill in opponent, venue, and location.",
      });
      return;
    }

    const timestamp = parseDateTimeLocal(form.date);
    setSaving(true);
    try {
      const teams = buildFixtureMatchup({
        venueType: form.venueType,
        opponent: form.opponent,
      });

      const payload = {
        seasonKey: form.seasonKey,
        seasonLabel: form.seasonLabel,
        seasonYear: form.seasonYear,
        gameNumber: Number(form.gameNumber),
        homeTeam: teams.homeTeam,
        awayTeam: teams.awayTeam,
        opponent: form.opponent.trim(),
        date: timestamp,
        venue: form.venue.trim(),
        location: form.location.trim(),
        venueType: form.venueType,
        status: form.status,
        isPublic: form.isPublic,
        liveScoreUrl: form.liveScoreUrl.trim(),
        youtubeUrl: form.youtubeUrl.trim(),
        resultText: form.resultText.trim(),
        mvp: form.mvp.trim(),
        notes: form.notes.trim(),
      };

      if (editingFixtureId) {
        await updateFixtureWithOptionalImage(editingFixtureId, payload, imageFile);
        toast({ kind: "success", title: "Fixture updated" });
      } else {
        await createFixtureWithOptionalImage(payload, imageFile);
        toast({ kind: "success", title: "Fixture created" });
      }

      resetForm();
    } catch (error) {
      toast({
        kind: "error",
        title: "Failed to save fixture",
        description: describeFirebasePermissionDenied(error),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(fixture: Fixture) {
    if (!window.confirm(`Delete ${fixtureMatchup(fixture)}?`)) return;
    try {
      await deleteFixture(fixture.id);
      toast({ kind: "success", title: "Fixture deleted" });
    } catch (error) {
      toast({
        kind: "error",
        title: "Failed to delete fixture",
        description: describeFirebasePermissionDenied(error),
      });
    }
  }

  async function quickUpdate(fixture: Fixture, updates: Partial<Fixture>) {
    try {
      await updateFixture(fixture.id, updates);
      toast({ kind: "success", title: "Fixture updated" });
    } catch (error) {
      toast({
        kind: "error",
        title: "Failed to update fixture",
        description: describeFirebasePermissionDenied(error),
      });
    }
  }

  return (
    <RequireAdmin>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Fixtures" }]} />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Fixtures Management</h1>
            <p className="mt-1 text-slate-600">
              Keep Mega Bash 2026 and Mega Smash 2026 current with live score links, results, MVP updates, and recap links.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/fixtures">
              <Button variant="outline">View Public Fixtures</Button>
            </Link>
            <Button variant="outline" onClick={() => void handleSeedSeason()} disabled={seeding}>
              <Upload className="size-4" />
              {seeding ? "Loading templates..." : "Load 2026 Templates"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Total fixtures" value={stats.total} />
          <StatCard title="Published" value={stats.published} />
          <StatCard title="Live now" value={stats.live} />
          <StatCard title="Completed" value={stats.completed} />
        </div>

        <Card>
          <CardHeader>
            <div className="font-bold text-lg">{editingFixtureId ? "Edit Fixture" : "Create Fixture"}</div>
            <div className="text-sm text-slate-600 mt-1">
              Build season fixtures, publish them when ready, and update match details after each game.
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Season</label>
                <Select
                  value={form.seasonKey}
                  onChange={(event) => {
                    const nextKey = event.target.value as FixtureSeasonKey;
                    const option = FIXTURE_SEASON_OPTIONS.find((item) => item.key === nextKey) ?? defaultSeason;
                    setForm((prev) => ({
                      ...prev,
                      seasonKey: option.key,
                      seasonLabel: option.label,
                    }));
                  }}
                >
                  {FIXTURE_SEASON_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Game number</label>
                <Input
                  type="number"
                  min={1}
                  value={form.gameNumber}
                  onChange={(event) => setField("gameNumber", Number(event.target.value))}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Opponent</label>
                <Input value={form.opponent} onChange={(event) => setField("opponent", event.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Date and time</label>
                <Input type="datetime-local" value={form.date} onChange={(event) => setField("date", event.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Venue</label>
                <Input value={form.venue} onChange={(event) => setField("venue", event.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Location</label>
                <Input value={form.location} onChange={(event) => setField("location", event.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Venue type</label>
                <Select value={form.venueType} onChange={(event) => setField("venueType", event.target.value as FixtureVenueType)}>
                  <option value="home">Home</option>
                  <option value="away">Away</option>
                  <option value="neutral">Neutral</option>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Status</label>
                <Select value={form.status} onChange={(event) => setField("status", event.target.value as FixtureStatus)}>
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                  <option value="postponed">Postponed</option>
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Live score URL</label>
                <Input value={form.liveScoreUrl} onChange={(event) => setField("liveScoreUrl", event.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">YouTube recap or channel URL</label>
                <Input value={form.youtubeUrl} onChange={(event) => setField("youtubeUrl", event.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Result</label>
                <Input value={form.resultText} onChange={(event) => setField("resultText", event.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">MVP</label>
                <Input value={form.mvp} onChange={(event) => setField("mvp", event.target.value)} />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-700">Match notes</label>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) => setField("notes", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Optional cricket hero image</label>
                <Input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} />
                <p className="mt-2 text-xs text-slate-500">
                  If no image is uploaded, the public cards use built-in cricket-themed backgrounds.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-7">
                <input
                  id="publish-fixture"
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(event) => setField("isPublic", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary/30"
                />
                <label htmlFor="publish-fixture" className="text-sm font-semibold text-slate-700">
                  Publish publicly
                </label>
              </div>

              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button onClick={() => void handleSubmit()} disabled={saving}>
                  {saving ? <RefreshCw className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  {editingFixtureId ? "Update Fixture" : "Create Fixture"}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Reset
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="font-bold text-lg">Fixtures List</div>
            <div className="text-sm text-slate-600 mt-1">
              Quickly update season, status, visibility, result details, and live links.
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by season, opponent, venue, or location"
              />
              <Select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value as FixtureSeasonKey | "all")}>
                <option value="all">All seasons</option>
                {FIXTURE_SEASON_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select value={filter} onChange={(event) => setFilter(event.target.value as FixtureFilter)}>
                <option value="all">All statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="postponed">Postponed</option>
              </Select>
            </div>

            <div className="mt-6 space-y-4">
              {loading ? (
                <p className="text-sm text-slate-600">Loading fixtures...</p>
              ) : filteredFixtures.length > 0 ? (
                filteredFixtures.map((fixture) => (
                  <div key={fixture.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-emerald-700 text-white">Game {fixture.gameNumber}</Badge>
                          <Badge className="bg-blue-100 text-blue-800">{fixture.seasonLabel}</Badge>
                          <Badge className={fixture.isPublic ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}>
                            {fixture.isPublic ? "Published" : "Draft"}
                          </Badge>
                          <Badge variant="secondary">{fixtureStatusLabel(fixture.status)}</Badge>
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900">{fixtureMatchup(fixture)}</h3>
                          <p className="mt-1 text-sm text-slate-600">{formatDate(fixture.date)}</p>
                        </div>
                        <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                          <p className="inline-flex items-center gap-2">
                            <CalendarDays className="size-4 text-emerald-700" />
                            {fixture.venue}
                          </p>
                          <p className="inline-flex items-center gap-2">
                            <Trophy className="size-4 text-emerald-700" />
                            {fixture.location}
                          </p>
                        </div>
                        {(fixture.resultText || fixture.mvp) && (
                          <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                            {fixture.resultText ? (
                              <p>
                                <strong>Result:</strong> {fixture.resultText}
                              </p>
                            ) : null}
                            {fixture.mvp ? (
                              <p>
                                <strong>MVP:</strong> {fixture.mvp}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
                        <Button size="sm" variant="outline" onClick={() => hydrateForm(fixture)}>
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void quickUpdate(fixture, { status: "live" })}>
                          <Radio className="size-4" />
                          Mark Live
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void quickUpdate(fixture, { status: "completed" })}
                        >
                          <Trophy className="size-4" />
                          Mark Completed
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void quickUpdate(fixture, { isPublic: !fixture.isPublic })}
                        >
                          {fixture.isPublic ? "Unpublish" : "Publish"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void handleDelete(fixture)}>
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <p className="text-lg font-semibold text-slate-900">No fixtures found</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Load the 2026 templates first or change your filters.
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </RequireAdmin>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-slate-500">{title}</div>
      <div className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950">{value}</div>
    </div>
  );
}
