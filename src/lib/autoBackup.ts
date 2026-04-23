// Automated monthly backup utility.
// Builds a JSON snapshot of all app data, persists the latest in localStorage,
// and exposes helpers to detect when a new monthly backup is due.
import {
  getDailyEntries,
  getFuelPrices,
  getMonthlyMap,
  getParts,
  getWithdrawals,
} from "./db";
import type { BackupV1 } from "./jsonBackup";

const K_LAST_BACKUP = "mtsy:autoBackup:last"; // ISO timestamp of last auto backup
const K_LAST_BACKUP_YM = "mtsy:autoBackup:lastYm"; // yyyy-mm of last auto backup
const K_LATEST_PAYLOAD = "mtsy:autoBackup:payload"; // latest JSON payload (string)
const K_PROMPT_DISMISSED_YM = "mtsy:autoBackup:dismissedYm"; // yyyy-mm dismissed prompt

const ymOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export type AutoBackupMeta = {
  lastBackupAt: string | null;
  lastBackupYm: string | null;
  hasPayload: boolean;
};

export function getAutoBackupMeta(): AutoBackupMeta {
  return {
    lastBackupAt: localStorage.getItem(K_LAST_BACKUP),
    lastBackupYm: localStorage.getItem(K_LAST_BACKUP_YM),
    hasPayload: !!localStorage.getItem(K_LATEST_PAYLOAD),
  };
}

export function getStoredBackupPayload(): string | null {
  return localStorage.getItem(K_LATEST_PAYLOAD);
}

/** Build a fresh backup payload from current data and store it locally. */
export async function generateAutoBackup(): Promise<BackupV1> {
  const [daily, monthly, parts, withdrawals, fuel] = await Promise.all([
    getDailyEntries(),
    getMonthlyMap(),
    getParts(),
    getWithdrawals(),
    getFuelPrices(),
  ]);
  const payload: BackupV1 = {
    version: 1,
    exportedAt: new Date().toISOString(),
    daily,
    monthly,
    parts,
    withdrawals,
    fuel,
  };
  const now = new Date();
  localStorage.setItem(K_LATEST_PAYLOAD, JSON.stringify(payload));
  localStorage.setItem(K_LAST_BACKUP, now.toISOString());
  localStorage.setItem(K_LAST_BACKUP_YM, ymOf(now));
  return payload;
}

/** Trigger a browser download of the stored backup (or a freshly built one). */
export async function downloadStoredBackup(): Promise<void> {
  let raw = getStoredBackupPayload();
  if (!raw) {
    const payload = await generateAutoBackup();
    raw = JSON.stringify(payload, null, 2);
  } else {
    // pretty-print on download
    try {
      raw = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      /* keep raw as-is */
    }
  }
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mtsy-auto-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Returns true when a new monthly backup is due:
 * - never backed up before, OR
 * - last backup was in a previous calendar month.
 */
export function isMonthlyBackupDue(): boolean {
  const lastYm = localStorage.getItem(K_LAST_BACKUP_YM);
  const currentYm = ymOf(new Date());
  return lastYm !== currentYm;
}

/**
 * Returns true when we should show the monthly prompt right now:
 * - backup is due, AND
 * - user hasn't dismissed this month's prompt.
 */
export function shouldPromptThisMonth(): boolean {
  if (!isMonthlyBackupDue()) return false;
  const dismissed = localStorage.getItem(K_PROMPT_DISMISSED_YM);
  return dismissed !== ymOf(new Date());
}

export function dismissMonthlyPrompt(): void {
  localStorage.setItem(K_PROMPT_DISMISSED_YM, ymOf(new Date()));
}

export function formatLastBackupLabel(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
