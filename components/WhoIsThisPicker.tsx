"use client";

import { SPOKE_BY_OPTIONS, type SpokeBy } from "@/lib/types";

export default function WhoIsThisPicker({
  onSelect,
}: {
  onSelect: (name: SpokeBy) => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-3xl">Marriage Lead Tracker</h1>
      <div className="w-full max-w-xs border-t border-(--color-divider) pt-6">
        <p className="kicker mb-3 text-left">Who&apos;s this?</p>
        <div className="flex flex-col gap-2">
          {SPOKE_BY_OPTIONS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onSelect(name)}
              className="btn btn-secondary w-full"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
