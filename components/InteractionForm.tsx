"use client";

import { useState } from "react";
import type { Interaction } from "@/lib/types";
import { usePoster } from "@/lib/posterContext";

function todayLocalDate() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export default function InteractionForm({
  leadId,
  onAdded,
}: {
  leadId: string;
  onAdded: (interaction: Interaction) => void;
}) {
  const { poster } = usePoster();
  const [date, setDate] = useState(todayLocalDate());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interaction_date: date, spoke_by: poster, notes }),
      });
      if (!res.ok) throw new Error("Failed to save update");
      const { interaction } = await res.json();
      onAdded(interaction);
      setNotes("");
      setDate(todayLocalDate());
    } catch {
      setError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-(--radius-xs) border border-(--color-divider) bg-white p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="field-input w-[150px]"
          required
        />
        <span className="text-xs text-(--color-label)">
          Posting as <strong className="text-ink">{poster}</strong>
        </span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What happened?"
        rows={3}
        className="field-input resize-none"
        required
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={saving} className="btn btn-primary self-start">
        {saving ? "Saving…" : "+ Add interaction"}
      </button>
    </form>
  );
}
