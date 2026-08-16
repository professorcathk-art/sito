/**
 * Calendly-style weekly availability → concrete slot generation.
 * Booking/payment still uses appointment_slots rows for Stripe compatibility.
 */

export type WeekdayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export interface TimeWindow {
  start: string; // "09:00"
  end: string; // "17:00"
}

export interface DateOverride {
  date: string; // YYYY-MM-DD
  /** true = fully blocked; false = custom hours for that day */
  blocked: boolean;
  windows?: TimeWindow[];
}

export interface AvailabilityRules {
  timezone: string;
  durationMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  horizonDays: number;
  weekly: Partial<Record<WeekdayKey, TimeWindow[]>>;
  dateOverrides: DateOverride[];
}

export const WEEKDAY_KEYS: WeekdayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

export const DEFAULT_AVAILABILITY_RULES: AvailabilityRules = {
  timezone: "Asia/Hong_Kong",
  durationMinutes: 60,
  bufferMinutes: 15,
  minNoticeHours: 24,
  horizonDays: 28,
  weekly: {
    mon: [{ start: "09:00", end: "17:00" }],
    tue: [{ start: "09:00", end: "17:00" }],
    wed: [{ start: "09:00", end: "17:00" }],
    thu: [{ start: "09:00", end: "17:00" }],
    fri: [{ start: "09:00", end: "17:00" }],
  },
  dateOverrides: [],
};

export function parseAvailabilityRules(raw: unknown): AvailabilityRules {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_AVAILABILITY_RULES, weekly: { ...DEFAULT_AVAILABILITY_RULES.weekly }, dateOverrides: [] };
  const r = raw as Partial<AvailabilityRules>;
  const weeklyRaw =
    r.weekly && typeof r.weekly === "object"
      ? (r.weekly as Partial<Record<WeekdayKey, TimeWindow[]>>)
      : { ...DEFAULT_AVAILABILITY_RULES.weekly };
  return {
    timezone: typeof r.timezone === "string" && r.timezone ? r.timezone : DEFAULT_AVAILABILITY_RULES.timezone,
    durationMinutes: Number(r.durationMinutes) > 0 ? Number(r.durationMinutes) : 60,
    bufferMinutes: Math.max(0, Number(r.bufferMinutes) || 0),
    minNoticeHours: Math.max(0, Number(r.minNoticeHours) || 0),
    horizonDays: Math.min(90, Math.max(7, Number(r.horizonDays) || 28)),
    weekly: normalizeWeeklyWindows(weeklyRaw),
    dateOverrides: Array.isArray(r.dateOverrides) ? r.dateOverrides : [],
  };
}

/** Accept HH:mm or HH:mm:ss (Safari/iOS time inputs often include seconds). */
export function normalizeHm(hm: string): string | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(hm || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function parseHm(hm: string): number | null {
  const normalized = normalizeHm(hm);
  if (!normalized) return null;
  const [h, min] = normalized.split(":").map(Number);
  return h * 60 + min;
}

function normalizeWeeklyWindows(
  weekly: Partial<Record<WeekdayKey, TimeWindow[]>>
): Partial<Record<WeekdayKey, TimeWindow[]>> {
  const out: Partial<Record<WeekdayKey, TimeWindow[]>> = {};
  for (const [day, windows] of Object.entries(weekly || {}) as [WeekdayKey, TimeWindow[]][]) {
    if (!Array.isArray(windows)) continue;
    const cleaned = windows
      .map((w) => {
        const start = normalizeHm(w?.start);
        const end = normalizeHm(w?.end);
        if (!start || !end) return null;
        return { start, end };
      })
      .filter(Boolean) as TimeWindow[];
    if (cleaned.length) out[day] = cleaned;
  }
  return out;
}

/** Local calendar date YYYY-MM-DD in a timezone */
export function dateKeyInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function weekdayKeyInTz(date: Date, timeZone: string): WeekdayKey {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const map: Record<string, WeekdayKey> = {
    Sun: "sun",
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
    Sat: "sat",
  };
  return map[wd] || "mon";
}

/**
 * Build a Date for YYYY-MM-DD + HH:mm interpreted in `timeZone`.
 * Uses iterative offset correction (no luxon dependency).
 */
export function zonedDateTimeToUtc(dateKey: string, hm: string, timeZone: string): Date {
  const [y, mo, d] = dateKey.split("-").map(Number);
  const minutes = parseHm(hm) ?? 0;
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  // Initial guess: treat as UTC
  let utc = Date.UTC(y, mo - 1, d, h, min, 0);
  for (let i = 0; i < 3; i++) {
    const asLocal = new Date(utc);
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(asLocal);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    let hour = get("hour");
    if (hour === 24) hour = 0;
    const got = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), 0);
    const want = Date.UTC(y, mo - 1, d, h, min, 0);
    utc += want - got;
  }
  return new Date(utc);
}

export interface GeneratedSlot {
  start_time: string; // ISO
  end_time: string;
}

export interface BusyInterval {
  start: string;
  end: string;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Generate bookable slot start/end times from weekly rules, minus busy intervals.
 */
export function generateSlotsFromRules(
  rules: AvailabilityRules,
  options?: {
    from?: Date;
    busy?: BusyInterval[];
  }
): GeneratedSlot[] {
  const from = options?.from ?? new Date();
  const busy = (options?.busy || []).map((b) => ({
    start: new Date(b.start).getTime(),
    end: new Date(b.end).getTime(),
  }));
  const duration = rules.durationMinutes;
  const buffer = rules.bufferMinutes;
  const step = duration + buffer;
  const minStart = from.getTime() + rules.minNoticeHours * 60 * 60 * 1000;
  const slots: GeneratedSlot[] = [];

  for (let dayOffset = 0; dayOffset < rules.horizonDays; dayOffset++) {
    const probe = new Date(from.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    // Noon UTC probe avoids DST edge for date-key extraction
    const noon = new Date(Date.UTC(probe.getUTCFullYear(), probe.getUTCMonth(), probe.getUTCDate(), 12));
    const dateKey = dateKeyInTz(noon, rules.timezone);
    // Recompute weekday from a zoned midday
    const midUtc = zonedDateTimeToUtc(dateKey, "12:00", rules.timezone);
    const weekday = weekdayKeyInTz(midUtc, rules.timezone);

    const override = rules.dateOverrides.find((o) => o.date === dateKey);
    if (override?.blocked) continue;

    const windows: TimeWindow[] =
      override && !override.blocked && override.windows?.length
        ? override.windows
        : rules.weekly[weekday] || [];

    for (const win of windows) {
      const startM = parseHm(win.start);
      const endM = parseHm(win.end);
      if (startM == null || endM == null || endM <= startM) continue;

      for (let m = startM; m + duration <= endM; m += step) {
        const sh = Math.floor(m / 60);
        const sm = m % 60;
        const eh = Math.floor((m + duration) / 60);
        const em = (m + duration) % 60;
        const startHm = `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
        const endHm = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
        const start = zonedDateTimeToUtc(dateKey, startHm, rules.timezone);
        const end = zonedDateTimeToUtc(dateKey, endHm, rules.timezone);
        if (start.getTime() < minStart) continue;

        const s = start.getTime();
        const e = end.getTime();
        // Expand busy by buffer on both sides for conflict check
        const conflict = busy.some((b) =>
          overlaps(s - buffer * 60 * 1000, e + buffer * 60 * 1000, b.start, b.end)
        );
        if (conflict) continue;

        slots.push({
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        });
      }
    }
  }

  return slots;
}

export function formatInTimeZone(
  iso: string,
  timeZone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  });
}
