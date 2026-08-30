"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PinGate() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    <div className="flex flex-1 items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs flex flex-col items-center gap-4"
      >
        <h1 className="text-lg font-medium text-neutral-800">
          Enter PIN
        </h1>
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
          className="w-full text-center text-2xl tracking-[0.5em] border border-neutral-300 rounded-lg py-3 focus:outline-none focus:ring-2 focus:ring-rose-400"
          placeholder="----"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pin.length !== 4 || loading}
          className="w-full bg-rose-500 disabled:bg-neutral-300 text-white rounded-lg py-2.5 font-medium transition-colors hover:bg-rose-600 disabled:hover:bg-neutral-300"
        >
          {loading ? "Checking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
