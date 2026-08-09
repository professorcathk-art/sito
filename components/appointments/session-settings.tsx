"use client";

import { RichTextEditor } from "@/components/rich-text-editor";

export interface SessionSettingsForm {
  name: string;
  description: string;
  whatToExpect: string;
  meetingLocation: string;
  price: string;
  pricingType: "hourly" | "one_time";
}

interface SessionSettingsProps {
  form: SessionSettingsForm;
  onChange: (form: SessionSettingsForm) => void;
  onSave: () => void;
  saving: boolean;
}

export function SessionSettings({ form, onChange, onSave, saving }: SessionSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-50">Session settings</h2>
        <p className="mt-1 text-sm text-slate-400">
          Title, pricing, and the default video link assigned to new confirmed bookings.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-300">Session title</label>
          <input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500"
            placeholder="1:1 Mentorship Call"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-300">Description</label>
          <RichTextEditor
            content={form.description}
            onChange={(html) => onChange({ ...form, description: html })}
            placeholder="What clients get from this session…"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-300">What to expect</label>
          <textarea
            value={form.whatToExpect}
            onChange={(e) => onChange({ ...form, whatToExpect: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500"
            placeholder="Shown in confirmation emails after approval"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">Pricing model</label>
          <select
            value={form.pricingType}
            onChange={(e) =>
              onChange({ ...form, pricingType: e.target.value as "hourly" | "one_time" })
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500"
          >
            <option value="hourly">Hourly rate (USD)</option>
            <option value="one_time">Fixed session price (USD)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">
            {form.pricingType === "hourly" ? "Hourly rate ($)" : "Session price ($)"}
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={form.price}
            onChange={(e) => onChange({ ...form, price: e.target.value })}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-300">
            Default video / meeting link
          </label>
          <input
            type="url"
            value={form.meetingLocation}
            onChange={(e) => onChange({ ...form, meetingLocation: e.target.value })}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500"
            placeholder="https://zoom.us/j/… or Meet / Jitsi link"
          />
          <p className="mt-1 text-xs text-slate-500">
            Auto-filled onto new bookings when you approve them (you can still edit per booking).
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save session settings"}
      </button>
    </div>
  );
}
