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
