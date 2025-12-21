import CatchAllClientShell from "./client-shell";

// Generate one empty catch-all path so export is satisfied
export async function generateStaticParams() {
  return [{ slug: [] as string[] }];
}

export default function CatchAllPage() {
  return <CatchAllClientShell />;
}
