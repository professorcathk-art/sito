"use client";

import { useState } from "react";
import { HONEYPOT_FIELD } from "@/lib/honeypot";

/**
 * Invisible honeypot field. Wire `value` into submit payloads and reject if filled.
 */
export function HoneypotField({
  value,
  onChange,
  id = HONEYPOT_FIELD,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: "-9999px",
        top: "-9999px",
        opacity: 0,
        height: 0,
        width: 0,
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      <label htmlFor={id}>Leave this field empty</label>
      <input
        type="text"
        id={id}
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** Convenience hook for honeypot state + spam check */
export function useHoneypot() {
  const [honeypotValue, setHoneypotValue] = useState("");
  const isSpam = () => honeypotValue.trim().length > 0;
  return { honeypotValue, setHoneypotValue, isSpam };
}
