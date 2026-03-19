"use client";

import { useEffect, useMemo, useState } from "react";

import Container from "@/components/ui/Container";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

const HEADER_ALIASES = {
  date: ["date", "matchdate", "gamedate", "scheduledate"],
  time: ["time", "matchtime", "gametime", "starttime"],
  format: ["format", "matchformat", "gameformat"],
  ground: ["ground", "venue", "location", "field"],
  umpiring: ["umpiringteam", "umpiring", "umpireteam", "umpire"],
  team1: ["team1", "hometeam", "home", "hostteam", "firstteam", "teama"],
  team2: [
    "team2",
    "awayteam",
    "away",
    "visitorteam",
    "visitor",
    "opponent",
    "opposition",
    "secondteam",
    "teamb",
  ],
  team: [
    "team",
    "team1",
    "team2",
    "teama",
    "teamb",
    "home",
    "away",
    "opponent",
    "visitor",
  ],
};

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeColumnName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function humanizeColumnName(value) {
  return String(value ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
}

function deriveColumns(rows) {
  const columns = [];

  for (const row of rows) {
    for (const key of Object.keys(row ?? {})) {
      if (key === "id" || !String(key).trim()) continue;
      if (!columns.includes(key)) {
        columns.push(key);
      }
    }
  }

  return columns;
}

function getSchedulePayload(data) {
  if (Array.isArray(data)) {
    return {
      columns: deriveColumns(data),
      rows: data.map((row, index) => ({ id: row?.id ?? index + 1, ...row })),
    };
  }

  if (data && typeof data === "object" && Array.isArray(data.rows)) {
    const columns = Array.isArray(data.columns) && data.columns.length
      ? data.columns.filter((column) => column !== "id")
      : deriveColumns(data.rows);

    return {
      columns,
      rows: data.rows.map((row, index) => ({ id: row?.id ?? index + 1, ...row })),
    };
  }

  return { columns: [], rows: [] };
}

function isDateColumn(columnName) {
  return HEADER_ALIASES.date.includes(normalizeColumnName(columnName));
}

function normalizeDateValue(value) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return raw;
}

function formatDisplayDate(value) {
  if (!value) return "—";
  const normalizedValue = normalizeDateValue(value);
  const parsed = new Date(`${normalizedValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function useDebouncedValue(value, delayMs) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [value, delayMs]);

  return debouncedValue;
}

function getFirstMatchingColumn(columns, aliases) {
  return columns.find((column) => aliases.includes(normalizeColumnName(column))) ?? "";
}

function getTeamColumns(columns) {
  const directMatches = [
    getFirstMatchingColumn(columns, HEADER_ALIASES.team1),
    getFirstMatchingColumn(columns, HEADER_ALIASES.team2),
  ].filter(Boolean);

  const fallbackMatches = columns.filter((column) => {
    const normalized = normalizeColumnName(column);
    return HEADER_ALIASES.team.some((alias) => normalized.includes(alias));
  });

  return Array.from(new Set([...directMatches, ...fallbackMatches]));
}

function toDisplayValue(value, columnName) {
  if (isDateColumn(columnName)) {
    return normalizeDateValue(value);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return String(value ?? "").trim();
}

export default function SchedulePage() {
  const [scheduleData, setScheduleData] = useState({ columns: [], rows: [] });
  const [loading, setLoading] = useState(true);
  const [teamSearchInput, setTeamSearchInput] = useState("");
  const [myTeamSearchInput, setMyTeamSearchInput] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [groundFilter, setGroundFilter] = useState("all");
  const [umpiringTeamFilter, setUmpiringTeamFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const debouncedTeamSearch = useDebouncedValue(teamSearchInput, 300);
  const debouncedMyTeamSearch = useDebouncedValue(myTeamSearchInput, 300);

  useEffect(() => {
    let mounted = true;

    async function loadSchedule() {
      try {
        const response = await fetch("/data/schedule.json", { cache: "force-cache" });
        if (!response.ok) throw new Error("Failed to load schedule");
        const data = await response.json();
        if (!mounted) return;
        setScheduleData(getSchedulePayload(data));
      } catch {
        if (!mounted) return;
        setScheduleData({ columns: [], rows: [] });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadSchedule();

    return () => {
      mounted = false;
    };
  }, []);

  const semanticColumns = useMemo(() => {
    const columns = scheduleData.columns;
    return {
      date: getFirstMatchingColumn(columns, HEADER_ALIASES.date),
      time: getFirstMatchingColumn(columns, HEADER_ALIASES.time),
      format: getFirstMatchingColumn(columns, HEADER_ALIASES.format),
      ground: getFirstMatchingColumn(columns, HEADER_ALIASES.ground),
      umpiring: getFirstMatchingColumn(columns, HEADER_ALIASES.umpiring),
      teamColumns: getTeamColumns(columns),
    };
  }, [scheduleData.columns]);

  const normalizedSchedule = useMemo(() => {
    return scheduleData.rows.map((row, index) => {
      const values = scheduleData.columns.reduce((accumulator, column) => {
        accumulator[column] = toDisplayValue(row[column], column);
        return accumulator;
      }, {});

      const normalizedValues = scheduleData.columns.reduce((accumulator, column) => {
        accumulator[column] = normalizeText(values[column]);
        return accumulator;
      }, {});

      const visibleTeamValues = semanticColumns.teamColumns
        .map((column) => values[column])
        .filter(Boolean);
      const title = visibleTeamValues.slice(0, 2).join(" vs ");
      const normalizedDate = semanticColumns.date
        ? normalizeDateValue(values[semanticColumns.date])
        : "";

      return {
        id: row.id ?? index + 1,
        values,
        normalizedValues,
        _displayDate: semanticColumns.date
          ? formatDisplayDate(values[semanticColumns.date])
          : "",
        _normalizedDate: normalizedDate,
        _title: title,
      };
    });
  }, [scheduleData, semanticColumns]);

  const filterOptions = useMemo(() => {
    const formats = semanticColumns.format
      ? Array.from(
        new Set(normalizedSchedule.map((item) => item.values[semanticColumns.format]).filter(Boolean)),
      ).sort()
      : [];
    const grounds = semanticColumns.ground
      ? Array.from(
        new Set(normalizedSchedule.map((item) => item.values[semanticColumns.ground]).filter(Boolean)),
      ).sort()
      : [];
    const umpiringTeams = semanticColumns.umpiring
      ? Array.from(
        new Set(normalizedSchedule.map((item) => item.values[semanticColumns.umpiring]).filter(Boolean)),
      ).sort()
      : [];

    return { formats, grounds, umpiringTeams };
  }, [normalizedSchedule, semanticColumns]);

  const activeFilters = useMemo(() => {
    return {
      teamQuery: normalizeText(debouncedTeamSearch),
      myTeamQuery: normalizeText(debouncedMyTeamSearch),
      formatQuery: formatFilter === "all" ? "" : normalizeText(formatFilter),
      groundQuery: groundFilter === "all" ? "" : normalizeText(groundFilter),
      umpiringTeamQuery:
        umpiringTeamFilter === "all" ? "" : normalizeText(umpiringTeamFilter),
      dateQuery: dateFilter,
    };
  }, [debouncedTeamSearch, debouncedMyTeamSearch, formatFilter, groundFilter, umpiringTeamFilter, dateFilter]);

  const filteredSchedule = useMemo(() => {
    const {
      teamQuery,
      myTeamQuery,
      formatQuery,
      groundQuery,
      umpiringTeamQuery,
      dateQuery,
    } = activeFilters;

    return normalizedSchedule
      .map((row) => {
        const isPlayingMatch =
          Boolean(myTeamQuery) &&
          semanticColumns.teamColumns.some(
            (column) => row.normalizedValues[column] === myTeamQuery,
          );
        const isUmpiringMatch =
          Boolean(myTeamQuery) &&
          Boolean(semanticColumns.umpiring) &&
          row.normalizedValues[semanticColumns.umpiring] === myTeamQuery;

        return {
          ...row,
          _myTeamHighlightType: isPlayingMatch
            ? "playing"
            : isUmpiringMatch
              ? "umpiring"
              : "",
        };
      })
      .filter((row) => {
        const searchableColumns = semanticColumns.teamColumns.length
          ? semanticColumns.teamColumns
          : scheduleData.columns;
        const matchesTeam =
          !teamQuery ||
          searchableColumns.some((column) => row.normalizedValues[column]?.includes(teamQuery));
        const matchesMyTeam = !myTeamQuery || Boolean(row._myTeamHighlightType);
        const matchesFormat =
          !formatQuery ||
          !semanticColumns.format ||
          row.normalizedValues[semanticColumns.format] === formatQuery;
        const matchesGround =
          !groundQuery ||
          !semanticColumns.ground ||
          row.normalizedValues[semanticColumns.ground] === groundQuery;
        const matchesUmpiringTeam =
          !umpiringTeamQuery ||
          !semanticColumns.umpiring ||
          row.normalizedValues[semanticColumns.umpiring] === umpiringTeamQuery;
        const matchesDate =
          !dateQuery || !semanticColumns.date || row._normalizedDate === dateQuery;

        return (
          matchesTeam &&
          matchesMyTeam &&
          matchesFormat &&
          matchesGround &&
          matchesUmpiringTeam &&
          matchesDate
        );
      });
  }, [normalizedSchedule, activeFilters, semanticColumns, scheduleData.columns]);

  const detailColumns = useMemo(() => {
    const hiddenColumns = new Set(
      [
        semanticColumns.date,
        semanticColumns.time,
        semanticColumns.format,
        ...semanticColumns.teamColumns.slice(0, 2),
      ].filter(Boolean),
    );

    return scheduleData.columns.filter((column) => !hiddenColumns.has(column));
  }, [scheduleData.columns, semanticColumns]);

  const showStatusColumn = filteredSchedule.some((row) => row._myTeamHighlightType);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Container>
        <div className="py-8 space-y-6">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
              TCL NC League
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50">
              Schedule
            </h1>
            <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Browse schedule data loaded from a static JSON file generated from Excel and filter
              everything in the browser.
            </p>
          </div>

          <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">My Team Schedule</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Enter a team once to highlight that team&apos;s matches and umpiring assignments.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col gap-3 md:flex-row">
                <Input
                  value={myTeamSearchInput}
                  onChange={(event) => setMyTeamSearchInput(event.target.value)}
                  placeholder="Type your team name"
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => setMyTeamSearchInput("")}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Clear Search
                </button>
              </div>
            </CardBody>
          </Card>

          <Card className="border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Filter Matches</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Results update instantly using the columns available in the uploaded schedule file.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col gap-3 md:grid md:grid-cols-2 xl:grid-cols-5">
                <Input
                  value={teamSearchInput}
                  onChange={(event) => setTeamSearchInput(event.target.value)}
                  placeholder={
                    semanticColumns.teamColumns.length
                      ? "Search by team name"
                      : "Search all schedule columns"
                  }
                />

                {semanticColumns.format ? (
                  <Select value={formatFilter} onChange={(event) => setFormatFilter(event.target.value)}>
                    <option value="all">All {humanizeColumnName(semanticColumns.format).toLowerCase()}</option>
                    {filterOptions.formats.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </Select>
                ) : null}

                {semanticColumns.ground ? (
                  <Select value={groundFilter} onChange={(event) => setGroundFilter(event.target.value)}>
                    <option value="all">All {humanizeColumnName(semanticColumns.ground).toLowerCase()}</option>
                    {filterOptions.grounds.map((ground) => (
                      <option key={ground} value={ground}>
                        {ground}
                      </option>
                    ))}
                  </Select>
                ) : null}

                {semanticColumns.umpiring ? (
                  <Select
                    value={umpiringTeamFilter}
                    onChange={(event) => setUmpiringTeamFilter(event.target.value)}
                  >
                    <option value="all">
                      All {humanizeColumnName(semanticColumns.umpiring).toLowerCase()}
                    </option>
                    {filterOptions.umpiringTeams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </Select>
                ) : null}

                {semanticColumns.date ? (
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(event) => setDateFilter(event.target.value)}
                  />
                ) : null}
              </div>
            </CardBody>
          </Card>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {loading
                ? "Loading schedule..."
                : `${filteredSchedule.length} row${filteredSchedule.length === 1 ? "" : "s"} found`}
            </p>
            <button
              type="button"
              onClick={() => {
                setTeamSearchInput("");
                setFormatFilter("all");
                setGroundFilter("all");
                setUmpiringTeamFilter("all");
                setDateFilter("");
              }}
              className="text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
            >
              Clear filters
            </button>
          </div>

          <Card className="overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardBody className="p-0">
              {loading ? (
                <div className="p-8 text-sm text-slate-500 dark:text-slate-400">Loading schedule...</div>
              ) : filteredSchedule.length === 0 ? (
                <div className="p-8 text-center text-sm font-medium text-slate-600 dark:text-slate-300">
                  No matches found for selected filters.
                </div>
              ) : (
                <>
                  <div className="grid gap-4 p-4 md:hidden">
                    {filteredSchedule.map((match) => (
                      <div
                        key={match.id}
                        className={[
                          "rounded-2xl border p-4 shadow-sm",
                          match._myTeamHighlightType === "playing"
                            ? "border-amber-300 bg-amber-50/80 dark:border-amber-500/40 dark:bg-amber-500/10"
                            : match._myTeamHighlightType === "umpiring"
                              ? "border-violet-300 bg-violet-50/80 dark:border-violet-500/40 dark:bg-violet-500/10"
                              : "border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/40",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            {semanticColumns.date ? (
                              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {match._displayDate}
                              </p>
                            ) : null}
                            {semanticColumns.time ? (
                              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                {match.values[semanticColumns.time] || "—"}
                              </p>
                            ) : null}
                          </div>
                          {semanticColumns.format ? (
                            <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                              {match.values[semanticColumns.format]}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-4 space-y-3">
                          {match._myTeamHighlightType ? (
                            <span
                              className={[
                                "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                                match._myTeamHighlightType === "playing"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                                  : "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200",
                              ].join(" ")}
                            >
                              {match._myTeamHighlightType === "playing"
                                ? "My Team Match"
                                : "My Team Umpiring"}
                            </span>
                          ) : null}
                          <div>
                            <p className="text-base font-bold text-slate-950 dark:text-slate-50">
                              {match._title || "Schedule Entry"}
                            </p>
                          </div>

                          <div className="space-y-2 text-sm">
                            {detailColumns.map((column) => (
                              <div key={`${match.id}-${column}`}>
                                <p className="font-semibold text-slate-700 dark:text-slate-200">
                                  {humanizeColumnName(column)}
                                </p>
                                <p className="text-slate-600 dark:text-slate-300">
                                  {match.values[column] || "—"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800/80">
                      <tr className="text-left text-slate-700 dark:text-slate-200">
                        {showStatusColumn ? (
                          <th className="px-4 py-3 font-bold">Status</th>
                        ) : null}
                        {scheduleData.columns.map((column) => (
                          <th key={column} className="px-4 py-3 font-bold">
                            {humanizeColumnName(column)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSchedule.map((match, index) => (
                        <tr
                          key={match.id}
                          className={[
                            "border-t",
                            match._myTeamHighlightType === "playing"
                              ? "border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10"
                              : match._myTeamHighlightType === "umpiring"
                                ? "border-violet-200 bg-violet-50/70 dark:border-violet-500/30 dark:bg-violet-500/10"
                                : index % 2 === 0
                                  ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                                  : "border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/40",
                          ].join(" ")}
                        >
                          {showStatusColumn ? (
                            <td className="px-4 py-3">
                              {match._myTeamHighlightType ? (
                                <span
                                  className={[
                                    "inline-flex rounded-full px-2.5 py-1 text-xs font-bold",
                                    match._myTeamHighlightType === "playing"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                                      : "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200",
                                  ].join(" ")}
                                >
                                  {match._myTeamHighlightType === "playing"
                                    ? "My Team Match"
                                    : "My Team Umpiring"}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          ) : null}
                          {scheduleData.columns.map((column) => (
                            <td
                              key={`${match.id}-${column}`}
                              className="px-4 py-3 text-slate-700 dark:text-slate-300"
                            >
                              {column === semanticColumns.date
                                ? match._displayDate
                                : column === semanticColumns.format
                                  ? (
                                    <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                                      {match.values[column] || "—"}
                                    </span>
                                  )
                                  : match.values[column] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </Container>
    </div>
  );
}
