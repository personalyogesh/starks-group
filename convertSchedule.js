const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const INPUT_FILE = path.join(__dirname, "schedule.xlsx");
const OUTPUT_DIR = path.join(__dirname, "public", "data");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "schedule.json");
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

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

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

function convertSchedule() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Input file not found: ${INPUT_FILE}`);
  }

  const workbook = XLSX.readFile(INPUT_FILE, { cellDates: true });
  if (!workbook.SheetNames.length) {
    throw new Error("No worksheet found in schedule.xlsx");
  }

  const payload = extractWorkbookData(workbook);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2));

  console.log(
    `Converted ${payload.rows.length} row(s) from ${payload.sheets.length} sheet(s) to ${OUTPUT_FILE}`,
  );
  console.log("Run with: node convertSchedule.js");
}

try {
  convertSchedule();
} catch (error) {
  console.error("Schedule conversion failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
