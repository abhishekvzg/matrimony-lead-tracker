// Age is always decoded from date_of_birth so it never goes stale between
// visits. Dates are stored as "YYYY-MM-DD".
export function calculateAge(dob: string, asOf: Date = new Date()): number {
  const [year, month, day] = dob.split("-").map(Number);
  let age = asOf.getFullYear() - year;
  const hadBirthdayThisYear =
    asOf.getMonth() + 1 > month ||
    (asOf.getMonth() + 1 === month && asOf.getDate() >= day);
  if (!hadBirthdayThisYear) age--;
  return age;
}
