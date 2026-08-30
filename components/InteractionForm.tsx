"use client";

import { useState } from "react";
import { SPOKE_BY_OPTIONS, type SpokeBy, type Interaction } from "@/lib/types";

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
  const [date, setDate] = useState(todayLocalDate());
  const [spokeBy, setSpokeBy] = useState<SpokeBy>("You");
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
        body: JSON.stringify({ interaction_date: date, spoke_by: spokeBy, notes }),
      });
      if (!res.ok) throw new Error("Failed to save update");
      const { interaction } = await res.json();
      onAdded(interaction);
      setNotes("");
      setDate(todayLocalDate());
      setSpokeBy("You");
    } catch {
      setError("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 bg-neutral-50 rounded-lg p-3 border border-neutral-200"
    >
      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm"
          required
        />
        <select
          value={spokeBy}
          onChange={(e) => setSpokeBy(e.target.value as SpokeBy)}
          className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm"
        >
          {SPOKE_BY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What happened?"
        rows={2}
        className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm resize-none"
        required
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="self-start bg-rose-500 hover:bg-rose-600 disabled:bg-neutral-300 text-white text-sm font-medium rounded-md px-3 py-1.5 transition-colors"
      >
        {saving ? "Saving…" : "+ Add update"}
      </button>
    </form>
  );
}
