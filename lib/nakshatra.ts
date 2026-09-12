import "server-only";
import { supabaseAdmin } from "./supabase";

// Looks up the precomputed compatibility score for a (nakshatra, padam)
// pair against the family's fixed reference chart. Returns null when
// either field is missing or when there's no row for that combination yet
// (e.g. Rohini/Ashlesha, which aren't seeded) — the caller stores that as
// a null compatibility_score, same as a known-not-compatible row with no
// recorded point total.
export async function lookupCompatibilityScore(
  nakshatra: string | null | undefined,
  padam: string | null | undefined
): Promise<number | null> {
  if (!nakshatra || !padam) return null;

  const { data, error } = await supabaseAdmin()
    .from("nakshatra_scores")
    .select("score")
    .eq("nakshatra", nakshatra)
    .eq("padam", padam)
    .maybeSingle();

  if (error) throw error;
  return data ? (data.score as number | null) : null;
}

// All four padam scores for a nakshatra, for when the padam itself isn't
// known yet — lets the UI show every option instead of nothing.
export async function getPadamOptions(
  nakshatra: string
): Promise<{ padam: string; score: number | null }[]> {
  const { data, error } = await supabaseAdmin()
    .from("nakshatra_scores")
    .select("padam, score")
    .eq("nakshatra", nakshatra)
    .order("padam", { ascending: true });

  if (error) throw error;
  return (data ?? []) as { padam: string; score: number | null }[];
}

// A row present with a null score means "known Not Compatible, no point
// total recorded". No row at all means the chart simply doesn't cover that
// combination yet. Both end up as compatibility_score = null on the lead, so
// the chart itself is the only way to tell a real verdict from a gap.
export type ScoreChart = Map<string, Map<string, number | null>>;

// The whole table is at most 108 tiny rows, so one fetch per request beats a
// per-lead lookup and additionally reveals which combinations are missing.
export async function loadScoreChart(): Promise<ScoreChart> {
  const { data, error } = await supabaseAdmin()
    .from("nakshatra_scores")
    .select("nakshatra, padam, score")
    .order("padam", { ascending: true });

  if (error) throw error;

  const chart: ScoreChart = new Map();
  for (const row of (data ?? []) as {
    nakshatra: string;
    padam: string;
    score: number | null;
  }[]) {
    if (!chart.has(row.nakshatra)) chart.set(row.nakshatra, new Map());
    chart.get(row.nakshatra)!.set(row.padam, row.score);
  }
  return chart;
}

export function chartCovers(
  chart: ScoreChart,
  nakshatra: string | null,
  padam: string | null
): boolean {
  if (!nakshatra || !padam) return false;
  return chart.get(nakshatra)?.has(padam) ?? false;
}

export function padamOptionsFromChart(
  chart: ScoreChart,
  nakshatra: string
): { padam: string; score: number | null }[] {
  const padams = chart.get(nakshatra);
  if (!padams) return [];
  return [...padams.entries()]
    .map(([padam, score]) => ({ padam, score }))
    .sort((a, b) => a.padam.localeCompare(b.padam));
}
