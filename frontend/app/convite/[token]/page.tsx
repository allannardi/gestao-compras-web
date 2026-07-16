import { InvitationAccess } from "@/components/invitation-access";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function InvitationPage({ params }: Props) {
  const { token } = await params;
  return (
    <main className="page-shell invitation-page-shell">
      <InvitationAccess apiUrl={API_URL} token={token} />
    </main>
  );
}
