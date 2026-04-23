import { formatDate } from "#/lib/utils";

export const BUSINESS_TIME_ZONE = "America/Chicago";
export const REJECTED_NOTE_PREFIX = "[REJECTED]";

export type VoucherStatus = "rejected" | "pending" | "processed";

type DateKeyOptions = {
  timeZone?: string;
};

export function normalizeDateKey(value: unknown, options: DateKeyOptions = {}): string | null {
  const { timeZone } = options;

  if (value instanceof Date) {
    return timeZone ? formatDateInTimeZone(value, timeZone) : formatDate(value);
  }

  if (value === null || value === undefined) {
    return null;
  }

  const rawText =
    typeof value === "string"
      ? value.trim()
      : typeof value === "number"
        ? String(value)
        : null;
  if (!rawText) {
    return null;
  }

  const datePrefixMatch = /^(\d{4}-\d{2}-\d{2})/.exec(rawText);
  if (datePrefixMatch?.[1]) {
    return datePrefixMatch[1];
  }

  const parsed = new Date(rawText);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return timeZone ? formatDateInTimeZone(parsed, timeZone) : formatDate(parsed);
}

export function getTodayDateKey(options: DateKeyOptions = {}): string {
  const { timeZone } = options;
  const now = new Date();
  return timeZone ? formatDateInTimeZone(now, timeZone) : formatDate(now);
}

export function isRejectedVoucherDescription(description: unknown): boolean {
  const text = toSafeText(description);
  return text.startsWith(REJECTED_NOTE_PREFIX);
}

type VoucherStatusInput = {
  paymentDate: unknown;
  description: unknown;
  todayKey: string;
  timeZone?: string;
};

export function getVoucherStatus(input: VoucherStatusInput): VoucherStatus {
  const paymentDateKey = normalizeDateKey(input.paymentDate, { timeZone: input.timeZone });
  const isRejected = isRejectedVoucherDescription(input.description);

  if (isRejected) {
    return "rejected";
  }

  if (paymentDateKey && paymentDateKey > input.todayKey) {
    return "pending";
  }

  return "processed";
}

export function formatPayType(payType: unknown): string {
  const rawValue =
    typeof payType === "string"
      ? payType
      : typeof payType === "number"
        ? String(payType)
        : "";

  return rawValue
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatRejectedVoucherDescription(previousDescription: unknown, nowIso: string): string {
  const previousText = toSafeText(previousDescription);
  return previousText
    ? `${REJECTED_NOTE_PREFIX} Payment was rejected at ${nowIso}. Previous note: ${previousText}`
    : `${REJECTED_NOTE_PREFIX} Payment was rejected at ${nowIso}.`;
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function toSafeText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value).trim();
  }

  return "";
}
