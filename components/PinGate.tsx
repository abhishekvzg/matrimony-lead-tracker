"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TAGLINES } from "@/lib/taglines";

export default function PinGate() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [taglineIndex, setTaglineIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((i) => (i + 1) % TAGLINES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        router.push("/tracker");
        router.refresh();
      } else {
        setError("Incorrect PIN");
        setPin("");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
      <div>
        <h1 className="text-4xl">Marriage Lead Tracker</h1>
        <p className="mt-2 min-h-[22px] text-[15px] text-(--color-label)">
          {TAGLINES[taglineIndex]}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xs flex-col items-center gap-4 border-t border-(--color-divider) pt-6"
      >
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          autoFocus
          value={pin}
          onChange={(e) => {
            setError("");
            setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
          }}
          className="field-input text-center text-2xl tracking-[0.5em]"
          placeholder="----"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pin.length !== 4 || loading}
          className="btn btn-primary w-full"
        >
          {loading ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
