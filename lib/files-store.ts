import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

export interface PersonEntry {
  id: string;
  cells: string[];
  displayName: string;
}

export interface FileOption {
  name: string;
  label: string;
}

const FILES_DIR = path.join(process.cwd(), "Files");
const WORKBOOK_EXTENSIONS = new Set([".xlsx", ".xls", ".csv"]);

function isWorkbookFile(fileName: string) {
  return WORKBOOK_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function normalizeCell(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function toPersonEntry(cells: string[], index: number) {
  const displayName = cells.join(" | ").trim();

  return {
    id: `person-${index}-${displayName.toLowerCase().replace(/\s+/g, "-")}`,
    cells,
    displayName,
  };
}

function sanitizeRequestedFile(fileName: string) {
  const normalizedName = path.basename(fileName);

  if (!normalizedName || normalizedName !== fileName || !isWorkbookFile(normalizedName)) {
    throw new Error("Invalid file name.");
  }

  return normalizedName;
}

export async function ensureFilesDirectory() {
  await fs.mkdir(FILES_DIR, { recursive: true });
  return FILES_DIR;
}

export async function listWorkbookFiles(): Promise<FileOption[]> {
  await ensureFilesDirectory();

  const entries = await fs.readdir(FILES_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && isWorkbookFile(entry.name))
    .map((entry) => ({
      name: entry.name,
      label: entry.name.replace(/\.[^.]+$/, ""),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function readPeopleFromWorkbook(fileName: string): Promise<PersonEntry[]> {
  await ensureFilesDirectory();

  const safeFileName = sanitizeRequestedFile(fileName);
  const filePath = path.join(FILES_DIR, safeFileName);
  const fileBuffer = await fs.readFile(filePath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!firstSheet) {
    return [];
  }

  const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][];
  const people = rows
    .map((row, index) => {
      const cells = row.map(normalizeCell).filter(Boolean);

      if (cells.length === 0) {
        return null;
      }

      return toPersonEntry(cells, index);
    })
    .filter((entry): entry is PersonEntry => entry !== null);

  return people;
}

export function buildWinnersWorkbook(sourceFileName: string, winners: PersonEntry[]) {
  const safeSourceFileName = sanitizeRequestedFile(sourceFileName);
  const sourceBaseName = safeSourceFileName.replace(/\.[^.]+$/, "");
  const maxColumnCount = winners.reduce(
    (highest, winner) => Math.max(highest, winner.cells.length),
    0,
  );
  const rows = winners.map((winner, index) => {
    const row: Record<string, string | number> = {
      Order: index + 1,
    };

    winner.cells.forEach((cell, cellIndex) => {
      row[`Column ${cellIndex + 1}`] = cell;
    });

    for (let cellIndex = winner.cells.length; cellIndex < maxColumnCount; cellIndex += 1) {
      row[`Column ${cellIndex + 1}`] = "";
    }

    return row;
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(
    rows.length > 0 ? rows : [{ Order: "", "Column 1": "" }],
  );

  XLSX.utils.book_append_sheet(workbook, worksheet, "Winners");

  const outputFileName = `winners-${sourceBaseName}.xlsx`;
  const workbookBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return {
    fileName: outputFileName,
    buffer: workbookBuffer,
  };
}
