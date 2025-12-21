import Link from "next/link";

export default function ClientStandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary" />
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">VideoProduction</span>
            <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
              CLIENT
            </span>
          </div>
        </div>
        <Link
          href="/dashboard/client?tab=projects"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to Projects
        </Link>
      </header>
      <main className="mx-auto w-full max-w-5xl p-4 lg:p-6">{children}</main>
    </div>
  );
}
