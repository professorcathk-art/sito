"use client";

import {
  WEEKDAY_LABELS,
  type AvailabilityRules,
  type TimeWindow,
  type WeekdayKey,
} from "@/lib/appointment-availability";

interface AvailabilitySettingsProps {
  rules: AvailabilityRules;
  onChange: (rules: AvailabilityRules) => void;
  onSave: () => void;
  saving: boolean;
  lastSyncedCount?: number | null;
}

function emptyWindow(): TimeWindow {
  return { start: "09:00", end: "17:00" };
}

export function AvailabilitySettings({
  rules,
  onChange,
  onSave,
  saving,
  lastSyncedCount,
}: AvailabilitySettingsProps) {
  const setDayEnabled = (day: WeekdayKey, enabled: boolean) => {
    const weekly = { ...rules.weekly };
    if (enabled) {
      weekly[day] = weekly[day]?.length ? weekly[day] : [emptyWindow()];
    } else {
      delete weekly[day];
    }
    onChange({ ...rules, weekly });
  };

  const updateWindow = (day: WeekdayKey, index: number, patch: Partial<TimeWindow>) => {
    const windows = [...(rules.weekly[day] || [])];
    windows[index] = { ...windows[index], ...patch };
    onChange({ ...rules, weekly: { ...rules.weekly, [day]: windows } });
  };

  const addWindow = (day: WeekdayKey) => {
    const windows = [...(rules.weekly[day] || []), { start: "14:00", end: "17:00" }];
    onChange({ ...rules, weekly: { ...rules.weekly, [day]: windows } });
  };

  const removeWindow = (day: WeekdayKey, index: number) => {
    const windows = (rules.weekly[day] || []).filter((_, i) => i !== index);
    const weekly = { ...rules.weekly };
    if (windows.length === 0) delete weekly[day];
    else weekly[day] = windows;
    onChange({ ...rules, weekly });
  };

  const addBlockedDate = (date: string) => {
    if (!date) return;
    if (rules.dateOverrides.some((o) => o.date === date)) return;
    onChange({
      ...rules,
      dateOverrides: [...rules.dateOverrides, { date, blocked: true }].sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    });
  };

  const removeOverride = (date: string) => {
    onChange({
      ...rules,
      dateOverrides: rules.dateOverrides.filter((o) => o.date !== date),
    });
  };

  // Mon-first display order
  const displayDays: WeekdayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-50">Weekly availability</h2>
        <p className="mt-1 text-sm text-slate-400">
          Set recurring hours like Calendly. Saving regenerates bookable slots for the next{" "}
          {rules.horizonDays} days.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Session duration
          </label>
          <select
            value={rules.durationMinutes}
            onChange={(e) => onChange({ ...rules, durationMinutes: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100"
          >
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Buffer between sessions
          </label>
          <select
            value={rules.bufferMinutes}
            onChange={(e) => onChange({ ...rules, bufferMinutes: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100"
          >
            {[0, 5, 10, 15, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m === 0 ? "None" : `${m} min`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Minimum notice
          </label>
          <select
            value={rules.minNoticeHours}
            onChange={(e) => onChange({ ...rules, minNoticeHours: Number(e.target.value) })}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100"
          >
            {[0, 1, 2, 4, 12, 24, 48, 72].map((h) => (
              <option key={h} value={h}>
                {h === 0 ? "Anytime" : `${h} hours ahead`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Timezone
          </label>
          <select
            value={rules.timezone}
            onChange={(e) => onChange({ ...rules, timezone: e.target.value })}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100"
          >
            {[
              "Asia/Hong_Kong",
              "Asia/Singapore",
              "Asia/Tokyo",
              "Asia/Shanghai",
              "America/Los_Angeles",
              "America/New_York",
              "Europe/London",
              "Europe/Paris",
              "Australia/Sydney",
              "UTC",
            ].map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {displayDays.map((day) => {
          const enabled = Boolean(rules.weekly[day]?.length);
          const windows = rules.weekly[day] || [];
          return (
            <div
              key={day}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex min-w-[7.5rem] items-center gap-2 text-sm font-medium text-slate-200">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setDayEnabled(day, e.target.checked)}
                    className="rounded border-slate-600"
                  />
                  {WEEKDAY_LABELS[day]}
                </label>
                {!enabled ? (
                  <span className="text-sm text-slate-500">Unavailable</span>
                ) : (
                  <div className="flex flex-1 flex-col gap-2">
                    {windows.map((win, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <input
                          type="time"
                          value={win.start}
                          onChange={(e) => updateWindow(day, idx, { start: e.target.value })}
                          className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
                        />
                        <span className="text-slate-500">–</span>
                        <input
                          type="time"
                          value={win.end}
                          onChange={(e) => updateWindow(day, idx, { end: e.target.value })}
                          className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
                        />
                        {windows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeWindow(day, idx)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addWindow(day)}
                      className="w-fit text-xs font-medium text-sky-400 hover:text-sky-300"
                    >
                      + Add time window
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-200">Date overrides</h3>
        <p className="mt-1 text-xs text-slate-500">Block holidays or days off.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="date"
            id="block-date"
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            onChange={(e) => {
              addBlockedDate(e.target.value);
              e.target.value = "";
            }}
          />
          <span className="text-xs text-slate-500">Pick a date to block</span>
        </div>
        {rules.dateOverrides.length > 0 && (
          <ul className="mt-3 space-y-2">
            {rules.dateOverrides.map((o) => (
              <li
                key={o.date}
                className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm"
              >
                <span className="text-slate-300">
                  {o.date} · {o.blocked ? "Blocked" : "Custom hours"}
                </span>
                <button
                  type="button"
                  onClick={() => removeOverride(o.date)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
        >
          {saving ? "Saving & syncing…" : "Save & sync open slots"}
        </button>
        {typeof lastSyncedCount === "number" && (
          <p className="text-sm text-emerald-400">{lastSyncedCount} open slots ready to book</p>
        )}
      </div>

    </div>
  );
}
