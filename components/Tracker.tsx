"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { SPOKE_BY_OPTIONS, type Interaction, type LeadStatus, type LeadWithRelations, type SpokeBy } from "@/lib/types";
import { TAGLINES } from "@/lib/taglines";
import { PosterContext } from "@/lib/posterContext";
import LeadRow from "./LeadRow";
import LeadDetail from "./LeadDetail";
import AddLeadModal from "./AddLeadModal";
import WhoIsThisPicker from "./WhoIsThisPicker";

const POSTER_STORAGE_KEY = "mlt_poster";
const POSTER_EVENT = "mlt_poster_changed";

function subscribeToPoster(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(POSTER_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(POSTER_EVENT, callback);
  };
}

function getPosterSnapshot(): SpokeBy | null {
  const stored = localStorage.getItem(POSTER_STORAGE_KEY);
  // Guards against a name saved by an older build (e.g. "Dad", "You") that
  // no longer matches the current roster — falls back to re-picking.
  return stored && (SPOKE_BY_OPTIONS as readonly string[]).includes(stored)
    ? (stored as SpokeBy)
    : null;
}

function getPosterServerSnapshot(): SpokeBy | null {
  return null;
}

type StatusFilter = "active" | "all" | "hidden";
type SortBy = "updated" | "name" | "age";

export default function Tracker({
  initialLeads,
}: {
  initialLeads: LeadWithRelations[];
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [loading, setLoading] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [sortBy, setSortBy] = useState<SortBy>("updated");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const poster = useSyncExternalStore(
    subscribeToPoster,
    getPosterSnapshot,
    getPosterServerSnapshot
  );

  const fetchLeads = useCallback(async (filter: StatusFilter) => {
    setLoading(true);
    try {
      if (filter === "all") {
        const [activeRes, hiddenRes] = await Promise.all([
          fetch(`/api/leads?hidden=false`),
          fetch(`/api/leads?hidden=true`),
        ]);
        const [{ leads: a }, { leads: h }] = await Promise.all([
          activeRes.json(),
          hiddenRes.json(),
        ]);
        setLeads([...a, ...h]);
      } else {
        const res = await fetch(`/api/leads?hidden=${filter === "hidden"}`);
        const { leads } = await res.json();
        setLeads(leads);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleStatusFilterChange(filter: StatusFilter) {
    setStatusFilter(filter);
    setSelectedLeadId(null);
    await fetchLeads(filter);
  }

  async function handleStatusChange(id: string, status: LeadStatus) {
    setLeads((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, status } : l));
      if (statusFilter === "all") return updated;
      const hidden = statusFilter === "hidden";
      return updated.filter((l) => (l.status === "Hide") === hidden);
    });
    setSelectedLeadId((cur) => (cur === id && statusFilter !== "all" ? null : cur));
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  function handleInteractionAdded(id: string, interaction: Interaction, status: LeadStatus) {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, interactions: [interaction, ...l.interactions], status } : l
      )
    );
  }

  function handleLeadUpdated(updated: LeadWithRelations) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  async function handleLeadCreated(id: string) {
    setModalOpen(false);
    setStatusFilter("active");
    const res = await fetch(`/api/leads/${id}`);
    if (res.ok) {
      const { lead } = await res.json();
      setLeads((prev) => [lead, ...prev.filter((l) => l.id !== id)]);
      setSelectedLeadId(id);
    }
  }

  function selectPoster(name: SpokeBy) {
    localStorage.setItem(POSTER_STORAGE_KEY, name);
    window.dispatchEvent(new Event(POSTER_EVENT));
  }

  function switchPoster() {
    localStorage.removeItem(POSTER_STORAGE_KEY);
    window.dispatchEvent(new Event(POSTER_EVENT));
  }

  const visibleLeads = useMemo(() => {
    let list = leads;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          (l.name ?? "").toLowerCase().includes(q) ||
          (l.location ?? "").toLowerCase().includes(q)
      );
    }
    if (sortBy !== "updated") {
      list = [...list].sort((a, b) => {
        if (sortBy === "name") return (a.name ?? "").localeCompare(b.name ?? "");
        return (b.age ?? -1) - (a.age ?? -1);
      });
    }
    return list;
  }, [leads, search, sortBy]);

  const filtersActive = statusFilter !== "active" || sortBy !== "updated";
  const selectedLead = selectedLeadId ? leads.find((l) => l.id === selectedLeadId) : null;

  if (!poster) {
    return <WhoIsThisPicker onSelect={selectPoster} />;
  }

  return (
    <PosterContext.Provider value={{ poster, switchPoster }}>
      <div className="flex flex-1 flex-col">
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-(--color-divider) bg-page px-4 py-3">
          <h1 className="text-xl">Marriage Lead Tracker</h1>
          <div className="flex items-center gap-2 text-sm">
            <button type="button" onClick={switchPoster} className="btn btn-ghost">
              Switch
            </button>
            <div className="rounded-md bg-accent-600 p-0.5">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="btn text-white"
              >
                + New Lead
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden border-b border-(--color-divider) bg-accent-100 py-2">
          <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-9 whitespace-nowrap text-[13px] text-accent-700">
            {[...TAGLINES, ...TAGLINES].map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </div>

        {selectedLead ? (
          <div className="mx-auto w-full max-w-3xl flex-1 px-3 py-6 sm:px-6">
            <button
              type="button"
              onClick={() => setSelectedLeadId(null)}
              className="btn btn-secondary mb-4"
            >
              <span className="text-lg leading-none">←</span> Back
            </button>
            <LeadDetail
              lead={selectedLead}
              onInteractionAdded={(interaction, status) =>
                handleInteractionAdded(selectedLead.id, interaction, status)
              }
              onLeadUpdated={handleLeadUpdated}
            />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-4xl flex-1 px-3 py-6 sm:px-6">
            <div className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-(--color-label)">
                  ⌕
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or location"
                  className="field-input pl-7"
                />
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="btn btn-secondary relative shrink-0"
              >
                ▤ Filters
                {filtersActive && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                    1
                  </span>
                )}
              </button>
            </div>

            <div className="card overflow-x-auto">
              {loading ? (
                <p className="py-10 text-center text-sm text-(--color-label)">Loading…</p>
              ) : visibleLeads.length === 0 ? (
                <p className="py-10 text-center text-sm text-(--color-label)">
                  {leads.length === 0
                    ? statusFilter === "hidden"
                      ? "No hidden leads."
                      : "No leads yet. Add one to get started."
                    : "No leads match."}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="kicker border-b border-(--color-divider) text-left">
                      <th className="py-2 pr-2 pl-4 font-medium sm:pl-6">Name</th>
                      <th className="hidden py-2 px-2 font-medium sm:table-cell">Age</th>
                      <th className="hidden py-2 px-2 font-medium sm:table-cell">Location</th>
                      <th className="py-2 px-2 font-medium">Stage</th>
                      <th className="py-2 pr-4 pl-2 font-medium sm:pr-6">Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLeads.map((lead) => (
                      <LeadRow
                        key={lead.id}
                        lead={lead}
                        onSelect={() => setSelectedLeadId(lead.id)}
                        onStatusChange={(status) => handleStatusChange(lead.id, status)}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {filtersOpen && (
          <div
            className="dialog-backdrop"
            onClick={() => setFiltersOpen(false)}
          >
            <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between text-lg">
                <span>Filters &amp; sort</span>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="btn btn-ghost px-2 text-lg leading-none"
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="statusFilter" className="text-xs text-(--color-label)">
                  Status
                </label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value as StatusFilter)}
                  className="field-input"
                >
                  <option value="active">Active</option>
                  <option value="all">All</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="sortBy" className="text-xs text-(--color-label)">
                  Sort by
                </label>
                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="field-input"
                >
                  <option value="updated">Recently updated</option>
                  <option value="name">Name</option>
                  <option value="age">Age</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="btn btn-primary"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {modalOpen && (
          <AddLeadModal onClose={() => setModalOpen(false)} onCreated={handleLeadCreated} />
        )}
      </div>
    </PosterContext.Provider>
  );
}
