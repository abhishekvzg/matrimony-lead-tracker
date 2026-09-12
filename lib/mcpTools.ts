import "server-only";
import {
  addInteraction,
  createContacts,
  createLead,
  getLeadWithRelations,
  listLeadsWithRelations,
  updateLead,
  type LeadPatch,
} from "./leads";
import {
  COMPATIBILITY_THRESHOLD,
  LEAD_STATUSES,
  NAKSHATRAS,
  SPOKE_BY_OPTIONS,
  type ExtractedLeadFields,
  type LeadStatus,
  type LeadWithRelations,
  type SpokeBy,
} from "./types";

// Fields an MCP client is allowed to set on create/update. Deliberately the
// same vocabulary the extraction pipeline and the edit form already use, so
// there's one set of field names across the whole app.
const WRITABLE_FIELDS = [
  "name",
  "age",
  "height",
  "weight",
  "complexion",
  "education",
  "profession",
  "income",
  "location",
  "address",
  "date_of_birth",
  "time_of_birth",
  "place_of_birth",
  "rashi",
  "nakshatra",
  "nakshatra_padam",
  "religion",
  "caste",
  "gotra",
  "father_name",
  "father_occupation",
  "mother_name",
  "mother_occupation",
  "siblings",
  "other_details",
  "source",
] as const;

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const MCP_TOOLS: McpTool[] = [
  {
    name: "search_leads",
    description:
      "Search marriage prospect profiles by any combination of filters. Returns compact summaries with a link to each profile. Use this for questions like 'profiles aged 30 to 32', 'who is in discussion', 'compatible profiles in the US'. Age is always derived from date of birth, so it is current.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Free text matched against name, location, education, profession, caste and gotra.",
        },
        min_age: { type: "integer", description: "Minimum age in years, inclusive." },
        max_age: { type: "integer", description: "Maximum age in years, inclusive." },
        status: {
          type: "array",
          items: { type: "string", enum: [...LEAD_STATUSES] },
          description: "Only return profiles in these pipeline stages.",
        },
        compatible_only: {
          type: "boolean",
          description: `Only return profiles whose nakshatra compatibility score is at least ${COMPATIBILITY_THRESHOLD}/36.`,
        },
        min_compatibility: {
          type: "integer",
          description: "Minimum nakshatra compatibility score out of 36.",
        },
        nakshatra: {
          type: "string",
          enum: [...NAKSHATRAS],
          description: "Only return profiles with this nakshatra.",
        },
        include_hidden: {
          type: "boolean",
          description: "Include profiles whose status is 'Hide'. Defaults to false.",
        },
        limit: { type: "integer", description: "Maximum profiles to return. Defaults to 20." },
      },
    },
  },
  {
    name: "get_lead",
    description:
      "Get the complete profile for one prospect, including every field, all phone numbers, and the full history of logged conversations. Use after search_leads to look at someone in detail.",
    inputSchema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "The profile's id, as returned by search_leads." },
      },
      required: ["lead_id"],
    },
  },
  {
    name: "list_stale_leads",
    description:
      "List active profiles that have gone quiet — no conversation logged for a while — so they can be followed up on. Profiles that are rejected or hidden are never included.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "integer",
          description:
            "How many days of silence counts as stale. Defaults to 14.",
        },
      },
    },
  },
  {
    name: "create_lead",
    description:
      "Add a new marriage prospect profile. Only pass fields you actually know — never invent values. Age is derived automatically when date_of_birth is given.",
    inputSchema: {
      type: "object",
      properties: {
        ...fieldProperties(),
        contacts: {
          type: "array",
          description: "Phone numbers for this prospect.",
          items: {
            type: "object",
            properties: {
              label: {
                type: "string",
                description: "Whose number it is, e.g. 'Father', 'Self'.",
              },
              phone_number: { type: "string" },
            },
            required: ["phone_number"],
          },
        },
      },
    },
  },
  {
    name: "update_lead",
    description:
      "Update fields on an existing profile, including moving it to a different pipeline stage. Only pass the fields you want to change; everything else is left alone.",
    inputSchema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "The profile's id." },
        ...fieldProperties(),
        status: {
          type: "string",
          enum: [...LEAD_STATUSES],
          description: "Pipeline stage. Use 'Hide' to remove a profile from the active list.",
        },
      },
      required: ["lead_id"],
    },
  },
  {
    name: "add_interaction",
    description:
      "Log a conversation or update against a profile. Logging one automatically moves a profile from 'New' to 'Contacted'.",
    inputSchema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "The profile's id." },
        notes: { type: "string", description: "What was discussed." },
        spoke_by: {
          type: "string",
          enum: [...SPOKE_BY_OPTIONS],
          description: "Which family member had this conversation.",
        },
        interaction_date: {
          type: "string",
          description: "Date of the conversation as YYYY-MM-DD. Defaults to today.",
        },
      },
      required: ["lead_id", "notes", "spoke_by"],
    },
  },
];

function fieldProperties(): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const key of WRITABLE_FIELDS) {
    if (key === "age") {
      props[key] = {
        type: "integer",
        description:
          "Only use when date_of_birth is unknown — otherwise age is derived from it automatically.",
      };
    } else if (key === "date_of_birth") {
      props[key] = { type: "string", description: "YYYY-MM-DD." };
    } else if (key === "nakshatra") {
      props[key] = { type: "string", enum: [...NAKSHATRAS] };
    } else if (key === "nakshatra_padam") {
      props[key] = { type: "string", enum: ["1", "2", "3", "4"] };
    } else {
      props[key] = { type: "string" };
    }
  }
  return props;
}

function leadUrl(baseUrl: string, id: string): string {
  return `${baseUrl}/tracker?lead=${id}`;
}

function lastInteractionDate(lead: LeadWithRelations): string | null {
  // Interactions come back newest-first from the data layer.
  return lead.interactions[0]?.interaction_date ?? null;
}

function summarize(lead: LeadWithRelations, baseUrl: string) {
  const score = lead.compatibility_score;
  return {
    id: lead.id,
    name: lead.name,
    age: lead.age,
    location: lead.location,
    status: lead.status,
    education: lead.education,
    profession: lead.profession,
    nakshatra: lead.nakshatra,
    nakshatra_padam: lead.nakshatra_padam,
    compatibility_score: score === null ? null : `${score}/36`,
    compatible: score === null ? null : score >= COMPATIBILITY_THRESHOLD,
    interactions_logged: lead.interactions.length,
    last_interaction: lastInteractionDate(lead),
    added: lead.created_at.slice(0, 10),
    url: leadUrl(baseUrl, lead.id),
  };
}

function detail(lead: LeadWithRelations, baseUrl: string) {
  const score = lead.compatibility_score;
  return {
    id: lead.id,
    url: leadUrl(baseUrl, lead.id),
    status: lead.status,
    name: lead.name,
    age: lead.age,
    date_of_birth: lead.date_of_birth,
    time_of_birth: lead.time_of_birth,
    place_of_birth: lead.place_of_birth,
    height: lead.height,
    weight: lead.weight,
    complexion: lead.complexion,
    education: lead.education,
    profession: lead.profession,
    income: lead.income,
    location: lead.location,
    address: lead.address,
    rashi: lead.rashi,
    nakshatra: lead.nakshatra,
    nakshatra_padam: lead.nakshatra_padam,
    compatibility_score: score === null ? null : `${score}/36`,
    compatible: score === null ? null : score >= COMPATIBILITY_THRESHOLD,
    compatibility_manually_set: lead.is_score_overridden,
    religion: lead.religion,
    caste: lead.caste,
    gotra: lead.gotra,
    father_name: lead.father_name,
    father_occupation: lead.father_occupation,
    mother_name: lead.mother_name,
    mother_occupation: lead.mother_occupation,
    siblings: lead.siblings,
    other_details: lead.other_details,
    source: lead.source,
    contacts: lead.contacts.map((c) => ({ label: c.label, phone_number: c.phone_number })),
    interactions: lead.interactions.map((i) => ({
      date: i.interaction_date,
      spoke_by: i.spoke_by,
      notes: i.notes,
    })),
    photo_count: lead.attachments.length,
    added: lead.created_at.slice(0, 10),
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

type WritableFieldValues = Partial<ExtractedLeadFields> & { source?: string | null };

// Pulls the writable profile fields out of a tool's arguments, ignoring
// anything not in the allowlist so a client can't reach columns like
// compatibility_score that the app computes for itself.
function pickFields(args: Record<string, unknown>): WritableFieldValues {
  const fields: Record<string, string | number | null> = {};
  for (const key of WRITABLE_FIELDS) {
    if (!(key in args)) continue;
    const value = args[key];
    if (value === null || value === "") {
      fields[key] = null;
    } else if (key === "age") {
      fields[key] = asNumber(value) ?? null;
    } else if (typeof value === "string") {
      fields[key] = value.trim();
    }
  }
  // Keys come from WRITABLE_FIELDS and values are narrowed to what those
  // fields accept, so this assertion only restates what the loop guarantees.
  return fields as WritableFieldValues;
}

async function allLeads(includeHidden: boolean): Promise<LeadWithRelations[]> {
  if (!includeHidden) return listLeadsWithRelations(false);
  const [active, hidden] = await Promise.all([
    listLeadsWithRelations(false),
    listLeadsWithRelations(true),
  ]);
  return [...active, ...hidden];
}

export async function runMcpTool(
  name: string,
  args: Record<string, unknown>,
  baseUrl: string
): Promise<unknown> {
  switch (name) {
    case "search_leads": {
      const limit = asNumber(args.limit) ?? 20;
      let leads = await allLeads(args.include_hidden === true);

      const query = asString(args.query)?.toLowerCase();
      if (query) {
        leads = leads.filter((l) =>
          [l.name, l.location, l.education, l.profession, l.caste, l.gotra]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(query))
        );
      }

      const minAge = asNumber(args.min_age);
      if (minAge !== undefined) leads = leads.filter((l) => l.age !== null && l.age >= minAge);

      const maxAge = asNumber(args.max_age);
      if (maxAge !== undefined) leads = leads.filter((l) => l.age !== null && l.age <= maxAge);

      if (Array.isArray(args.status) && args.status.length > 0) {
        const wanted = new Set(args.status.map(String));
        leads = leads.filter((l) => wanted.has(l.status));
      }

      const minScore =
        args.compatible_only === true
          ? (asNumber(args.min_compatibility) ?? COMPATIBILITY_THRESHOLD)
          : asNumber(args.min_compatibility);
      if (minScore !== undefined) {
        leads = leads.filter(
          (l) => l.compatibility_score !== null && l.compatibility_score >= minScore
        );
      }

      const nakshatra = asString(args.nakshatra);
      if (nakshatra) {
        leads = leads.filter((l) => l.nakshatra === nakshatra);
      }

      return {
        total_matches: leads.length,
        showing: Math.min(leads.length, limit),
        profiles: leads.slice(0, limit).map((l) => summarize(l, baseUrl)),
      };
    }

    case "get_lead": {
      const id = asString(args.lead_id);
      if (!id) throw new Error("lead_id is required");
      const lead = await getLeadWithRelations(id);
      if (!lead) throw new Error(`No profile found with id ${id}`);
      return detail(lead, baseUrl);
    }

    case "list_stale_leads": {
      const days = asNumber(args.days) ?? 14;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const leads = await listLeadsWithRelations(false);
      const stale = leads.filter((l) => {
        if (l.status === "Rejected" || l.status === "Rejected by Other Side") return false;
        const last = lastInteractionDate(l);
        const reference = last ? new Date(last) : new Date(l.created_at);
        return reference < cutoff;
      });

      return {
        stale_after_days: days,
        count: stale.length,
        profiles: stale.map((l) => ({
          ...summarize(l, baseUrl),
          never_contacted: l.interactions.length === 0,
        })),
      };
    }

    case "create_lead": {
      const fields = pickFields(args);
      if (Object.keys(fields).length === 0) {
        throw new Error("Provide at least one field for the new profile");
      }
      const lead = await createLead(fields);

      if (Array.isArray(args.contacts)) {
        const contacts = args.contacts
          .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
          .map((c) => ({
            label: asString(c.label) ?? null,
            phone_number: asString(c.phone_number) ?? "",
          }))
          .filter((c) => c.phone_number.length > 0);
        if (contacts.length > 0) await createContacts(lead.id, contacts);
      }

      const fresh = await getLeadWithRelations(lead.id);
      return {
        created: true,
        profile: fresh ? detail(fresh, baseUrl) : { id: lead.id, url: leadUrl(baseUrl, lead.id) },
      };
    }

    case "update_lead": {
      const id = asString(args.lead_id);
      if (!id) throw new Error("lead_id is required");

      const patch = pickFields(args) as LeadPatch;
      const status = asString(args.status);
      if (status) {
        if (!(LEAD_STATUSES as readonly string[]).includes(status)) {
          throw new Error(`Invalid status. Must be one of: ${LEAD_STATUSES.join(", ")}`);
        }
        patch.status = status as LeadStatus;
      }
      if (Object.keys(patch).length === 0) {
        throw new Error("Provide at least one field to update");
      }

      await updateLead(id, patch);
      const fresh = await getLeadWithRelations(id);
      if (!fresh) throw new Error(`No profile found with id ${id}`);
      return { updated: true, profile: detail(fresh, baseUrl) };
    }

    case "add_interaction": {
      const id = asString(args.lead_id);
      if (!id) throw new Error("lead_id is required");

      const spokeBy = asString(args.spoke_by);
      if (!spokeBy || !(SPOKE_BY_OPTIONS as readonly string[]).includes(spokeBy)) {
        throw new Error(`spoke_by must be one of: ${SPOKE_BY_OPTIONS.join(", ")}`);
      }

      const notes = asString(args.notes);
      if (!notes) throw new Error("notes is required");

      const { interaction, status } = await addInteraction(id, {
        interaction_date: asString(args.interaction_date),
        spoke_by: spokeBy as SpokeBy,
        notes,
      });

      return {
        logged: true,
        date: interaction.interaction_date,
        spoke_by: interaction.spoke_by,
        lead_status_now: status,
        url: leadUrl(baseUrl, id),
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
