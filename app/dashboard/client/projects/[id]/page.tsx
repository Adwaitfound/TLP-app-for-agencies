import { redirect } from "next/navigation";

export default async function ClientLegacyProjectDetailsRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/client/project-details/${id}`);
}
