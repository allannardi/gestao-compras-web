import { AuthGate } from "@/components/auth-gate";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  return (
    <main className="page-shell">
      <AuthGate apiUrl={API_URL} />
    </main>
  );
}
