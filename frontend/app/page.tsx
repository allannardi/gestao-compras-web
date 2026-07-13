import { ApiAvailability } from "@/components/api-availability";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  return (
    <main className="page-shell">
      <ApiAvailability apiUrl={API_URL} />
    </main>
  );
}
