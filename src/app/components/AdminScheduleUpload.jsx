"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

import { RequireAdmin } from "@/components/RequireAdmin";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const DATE_COLUMN_ALIASES = [
  "date",
  "matchdate",
  "gamedate",
  "scheduledate",
];

const SCHEDULE_SIGNAL_ALIASES = {
  date: DATE_COLUMN_ALIASES,
  time: ["time", "matchtime", "gametime", "starttime"],
  format: ["format", "matchformat", "gameformat"],
  team: [
    "team",
    "team1",
    "team2",
    "teama",
    "teamb",
    "home",
    "hometeam",
    "away",
    "awayteam",
    "visitor",
    "visitorteam",
    "opponent",
    "opposition",
  ],
  ground: ["ground", "venue", "location", "field"],
  umpiring: ["umpiringteam", "umpiring", "umpireteam", "umpire"],
};

const META_SHEET_PATTERNS = [/validation/i, /summary/i, /readme/i, /instruction/i, /lookup/i, /notes?/i];

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

function getSheetColumns(rows) {
  const columns = [];

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!String(key).trim()) continue;
      if (!columns.includes(key)) {
        columns.push(key);
      }
    }
  }

  return columns;
}

function isDateColumn(columnName) {
  return DATE_COLUMN_ALIASES.includes(normalizeColumnName(columnName));
}

function normalizeDate(value) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const year = String(parsed.y).padStart(4, "0");
      const month = String(parsed.m).padStart(2, "0");
      const day = String(parsed.d).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
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

function toCellString(value, columnName) {
  if (isDateColumn(columnName)) {
    return normalizeDate(value);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return String(value ?? "").trim();
}

function isBlankRow(row, columns) {
  return columns.every((column) => String(row[column] ?? "").trim() === "");
}

function sheetLooksLikeSchedule(sheetName, rows) {
  if (META_SHEET_PATTERNS.some((pattern) => pattern.test(sheetName))) {
    return false;
  }

  const headers = getSheetColumns(rows).map((column) => normalizeColumnName(column));
  if (!headers.length) {
    return false;
  }

  const signalCount = Object.values(SCHEDULE_SIGNAL_ALIASES).reduce((count, aliases) => {
    return count + Number(headers.some((header) => aliases.includes(header)));
  }, 0);

  return headers.some((header) => DATE_COLUMN_ALIASES.includes(header)) && signalCount >= 2;
}

function extractWorkbookData(workbook) {
  const columns = [];
  const rows = [];
  const sheets = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const sheetRows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: true,
    });

    if (!sheetRows.length || !sheetLooksLikeSchedule(sheetName, sheetRows)) {
      continue;
    }

    const sheetColumns = getSheetColumns(sheetRows);
    for (const column of sheetColumns) {
      if (!columns.includes(column)) {
        columns.push(column);
      }
    }

    for (const row of sheetRows) {
      const normalizedRow = sheetColumns.reduce((accumulator, column) => {
        accumulator[column] = toCellString(row[column], column);
        return accumulator;
      }, {});

      if (!isBlankRow(normalizedRow, sheetColumns)) {
        rows.push({
          id: rows.length + 1,
          ...normalizedRow,
        });
      }
    }

    sheets.push(sheetName);
  }

  if (!rows.length) {
    throw new Error(
      "No schedule-like sheets were found. Keep the match tabs and exclude summary or validation tabs.",
    );
  }

  return { columns, rows, sheets };
}

export default function AdminScheduleUpload() {
  const [fileName, setFileName] = useState("");
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [sheetNames, setSheetNames] = useState([]);
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  const previewRows = useMemo(() => rows.slice(0, 50), [rows]);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError("");
    setColumns([]);
    setRows([]);
    setSheetNames([]);
    setFileName("");

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Please upload a .xlsx file.");
      return;
    }

    setIsParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      if (!workbook.SheetNames.length) {
        throw new Error("No worksheet found in the uploaded Excel file.");
      }

      const payload = extractWorkbookData(workbook);
      setColumns(payload.columns);
      setRows(payload.rows);
      setSheetNames(payload.sheets);
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse the uploaded file.");
    } finally {
      setIsParsing(false);
      event.target.value = "";
    }
  }

  function handleDownload() {
    if (!rows.length) return;

    const blob = new Blob([JSON.stringify({ columns, rows }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "schedule.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <RequireAdmin>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Breadcrumbs
          items={[
            { label: "Admin", href: "/admin" },
            { label: "Schedule Upload" },
          ]}
        />

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
              Schedule Upload
            </h1>
            <p className="mt-1 text-slate-600">
              Upload an Excel schedule, preview the output, and download
              <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">schedule.json</code>
              for website hosting.
            </p>
          </div>
          <Link href="/admin">
            <Button variant="outline">Back to Admin</Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="font-bold">Upload Excel File</div>
            <div className="mt-1 text-sm text-slate-600">
              The uploader combines schedule-like sheets, keeps the real Excel columns, and skips
              summary or validation tabs.
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800"
              />

              {isParsing && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  Parsing Excel file...
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {error}
                </div>
              )}

              {fileName && !error && !isParsing && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Parsed <span className="font-semibold">{fileName}</span> with{" "}
                  <span className="font-semibold">{rows.length}</span> row
                  {rows.length === 1 ? "" : "s"} from{" "}
                  <span className="font-semibold">{sheetNames.length}</span> sheet
                  {sheetNames.length === 1 ? "" : "s"}.
                  {sheetNames.length > 0 ? ` Included: ${sheetNames.join(", ")}.` : ""}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleDownload} disabled={!rows.length}>
                  Download schedule.json
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="font-bold">Preview</div>
            <div className="mt-1 text-sm text-slate-600">
              Showing {previewRows.length} of {rows.length} row{rows.length === 1 ? "" : "s"} with{" "}
              {columns.length} column{columns.length === 1 ? "" : "s"}.
            </div>
          </CardHeader>
          <CardBody>
            {!rows.length ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
                Upload a schedule Excel file to preview the converted JSON rows.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-left text-slate-700">
                    <tr>
                      {columns.map((column) => (
                        <th key={column} className="px-4 py-3 font-bold">
                          {humanizeColumnName(column)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, index) => (
                      <tr
                        key={row.id}
                        className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}
                      >
                        {columns.map((column) => (
                          <td key={`${row.id}-${column}`} className="px-4 py-3">
                            {row[column] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </RequireAdmin>
  );
}
