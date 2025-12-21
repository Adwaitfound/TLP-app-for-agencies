"use client";

import EnhancedClientProjectDetail from "@/components/client/enhanced-project-detail";

interface ClientProjectPageProps {
  projectId: string;
}

export default function ClientProjectPage({
  projectId,
}: ClientProjectPageProps) {
  return <EnhancedClientProjectDetail projectId={projectId} />;
}
