"use client";

import { useCallback, useState } from "react";
import type { Interaction, LeadStatus, LeadWithRelations } from "@/lib/types";
import LeadRow from "./LeadRow";
import AddLeadModal from "./AddLeadModal";

export default function Tracker({
  initialLeads,
}: {
  initialLeads: LeadWithRelations[];
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [showHidden, setShowHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchLeads = useCallback(async (hidden: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads?hidden=${hidden}`);
      const { leads } = await res.json();
      setLeads(leads);
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleViewChange(hidden: boolean) {
    setShowHidden(hidden);
    setExpandedId(null);
    await fetchLeads(hidden);
  }

  async function handleStatusChange(id: string, status: LeadStatus) {
    setLeads((prev) => {
      const updated = prev.map((l) => (l.id === id ? { ...l, status } : l));
      // A status change can move a lead out of the view currently shown
      // (e.g. hiding it while looking at the active list, or vice versa).
      return updated.filter((l) => (l.status === "Hide") === showHidden);
    });
    setExpandedId((cur) => (cur === id ? null : cur));
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  function handleInteractionAdded(id: string, interaction: Interaction) {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, interactions: [interaction, ...l.interactions] } : l
      )
    );
  }

  function handleLeadUpdated(updated: LeadWithRelations) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  async function handleLeadCreated(id: string) {
    setModalOpen(false);
    setShowHidden(false);
    const res = await fetch(`/api/leads/${id}`);
    if (res.ok) {
      const { lead } = await res.json();
      setLeads((prev) => [lead, ...prev.filter((l) => l.id !== id)]);
      setExpandedId(id);
    }
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg sm:text-xl font-semibold text-neutral-900">
          Lead Tracker
        </h1>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-lg px-3 sm:px-4 py-2 transition-colors whitespace-nowrap"
        >
          + New Lead
        </button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        {loading ? (
          <p className="text-center text-sm text-neutral-400 py-10">Loading…</p>
        ) : leads.length === 0 ? (
          <p className="text-center text-sm text-neutral-400 py-10">
            {showHidden ? "No hidden leads." : "No leads yet. Add one to get started."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-400 border-b border-neutral-200">
                <th className="py-2 pl-4 pr-2 sm:pl-6 font-medium">Name</th>
                <th className="py-2 px-2 hidden sm:table-cell font-medium">Age</th>
                <th className="py-2 px-2 hidden sm:table-cell font-medium">Location</th>
                <th className="py-2 px-2 font-medium">Status</th>
                <th className="py-2 pl-2 pr-4 sm:pr-6 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  expanded={expandedId === lead.id}
                  onToggle={() =>
                    setExpandedId((cur) => (cur === lead.id ? null : lead.id))
                  }
                  onStatusChange={(status) => handleStatusChange(lead.id, status)}
                  onInteractionAdded={(interaction) =>
                    handleInteractionAdded(lead.id, interaction)
                  }
                  onLeadUpdated={handleLeadUpdated}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-end">
        <label className="flex items-center gap-2 text-sm text-neutral-500">
          View
          <select
            value={showHidden ? "hidden" : "active"}
            onChange={(e) => handleViewChange(e.target.value === "hidden")}
            className="border border-neutral-300 rounded-md px-2 py-1 text-sm bg-white"
          >
            <option value="active">Active leads</option>
            <option value="hidden">Hidden leads</option>
          </select>
        </label>
      </div>

      {modalOpen && (
        <AddLeadModal
          onClose={() => setModalOpen(false)}
          onCreated={handleLeadCreated}
        />
      )}
    </div>
  );
}
