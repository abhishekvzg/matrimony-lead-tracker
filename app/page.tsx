import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_VALUE } from "@/lib/auth";
import PinGate from "@/components/PinGate";

export default async function Home() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (session === SESSION_COOKIE_VALUE) {
    redirect("/tracker");
  }

  return <PinGate />;
}
