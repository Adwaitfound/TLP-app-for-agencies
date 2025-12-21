"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle,
  FileText,
  FolderKanban,
  UserCog,
  Users,
  Zap,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginOptions, setShowLoginOptions] = useState(false);

  useEffect(() => {
    router.prefetch("/login");
  }, [router]);

  const handleGetStarted = () => setShowLoginOptions(true);

  const handleRoleLogin = (role: "admin" | "employee" | "client") => {
    setIsLoading(true);
    setShowLoginOptions(false);
    router.push(`/login?role=${role}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4 md:h-16 md:px-6">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <div className="flex h-9 items-center justify-center">
              <img
                src="https://www.thelostproject.in/cdn/shop/files/TLP_logo_for_Backlit-01-white.png?height=72&v=1760209067"
                alt="The Lost Project"
                className="h-6 w-auto sm:h-7"
                loading="eager"
              />
            </div>
          </Link>

          <Button
            onClick={handleGetStarted}
            disabled={isLoading}
            className="gap-2 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? "Loading..." : "Get Started"}
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="w-full">
          <div className="w-full">
            <div className="w-full overflow-hidden border-b bg-card/40">
              <div className="aspect-video w-full max-h-[calc(100dvh-3.5rem)] md:aspect-auto md:h-[calc(100vh-4rem)]">
                <video
                  className="h-full w-full object-cover"
                  src="https://www.thelostproject.in/cdn/shop/videos/c/vp/4ed9bfb7477a44cc8ae09bf6d593c482/4ed9bfb7477a44cc8ae09bf6d593c482.HD-1080p-7.2Mbps-59555655.mp4?v=0"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  preload="metadata"
                  controlsList="nodownload noplaybackrate noremoteplayback"
                  disablePictureInPicture
                />
              </div>
            </div>
          </div>
        </section>

        <section className="relative w-full overflow-hidden py-10 md:py-16 lg:py-24">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-[-10rem] h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-[-12rem] left-[-12rem] h-[28rem] w-[28rem] rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute bottom-[-10rem] right-[-10rem] h-[24rem] w-[24rem] rounded-full bg-primary/5 blur-3xl" />
          </div>
          <div className="container px-4 md:px-6">
            <div className="mx-auto flex max-w-4xl flex-col items-center space-y-7 text-center md:space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-xs font-medium uppercase tracking-widest text-primary">
                  The Lost Project
                </div>
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl md:leading-[1.05]">
                  Production, without the{" "}
                  <span className="bg-gradient-to-r from-primary via-primary/70 to-primary/40 bg-clip-text text-transparent">
                    chaos
                  </span>
                </h1>
                <p className="mx-auto max-w-[700px] text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
                  One place for projects, client feedback, milestones, files, and invoices — built for real production teams.
                </p>
              </div>

              <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:justify-center">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  disabled={isLoading}
                  className="w-full gap-2 rounded-full bg-primary px-8 text-primary-foreground hover:bg-primary/90 sm:w-auto"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleGetStarted}
                  className="w-full rounded-full bg-transparent px-8 sm:w-auto"
                >
                  Login
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full border-t bg-background py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Everything You Need
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Powerful features designed for video production professionals
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Project Management",
                  description:
                    "Track all your video projects from planning to completion with intuitive dashboards and progress tracking.",
                  icon: FolderKanban,
                },
                {
                  title: "Client Collaboration",
                  description:
                    "Share files, collect feedback, and communicate seamlessly with clients in real-time.",
                  icon: Users,
                },
                {
                  title: "Invoicing & Billing",
                  description:
                    "Create professional invoices, track payments, and manage your finances effortlessly.",
                  icon: FileText,
                },
                {
                  title: "Analytics & Reports",
                  description:
                    "Gain insights into your business with comprehensive analytics and visual reports.",
                  icon: BarChart3,
                },
                {
                  title: "Milestone Tracking",
                  description:
                    "Set and track project milestones to keep everyone aligned and on schedule.",
                  icon: CheckCircle,
                },
                {
                  title: "Automated Workflows",
                  description:
                    "Automate repetitive tasks and focus on what matters – creating amazing content.",
                  icon: Zap,
                },
              ].map((feature) => (
                <Card
                  key={feature.title}
                  className="border bg-card/30 text-card-foreground"
                >
                  <CardContent className="flex h-full flex-col items-center space-y-4 p-6 text-center">
                    <div className="rounded-full bg-primary/10 p-3">
                      <feature.icon className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full border-t bg-background py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <Card className="border border-primary/20 bg-card/40 text-card-foreground">
              <CardContent className="flex flex-col items-center space-y-6 p-8 text-center sm:p-10 md:p-12">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  Ready to Get Started?
                </h2>
                <p className="max-w-[720px] text-lg text-muted-foreground">
                  Join thousands of video professionals who trust our platform to manage their projects.
                </p>
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  disabled={isLoading}
                  className="gap-2 rounded-full bg-primary px-8 text-primary-foreground hover:bg-primary/90"
                >
                  {isLoading ? "Loading..." : "Get Started"}
                  {!isLoading && <ArrowRight className="h-5 w-5" />}
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="w-full border-t bg-background py-6">
        <div className="container flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row md:px-6">
          <div>© 2025 VideoProduction App. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <Link href="#privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="#terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="#contact" className="hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </footer>

      <Dialog open={showLoginOptions} onOpenChange={setShowLoginOptions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Your Login Type</DialogTitle>
            <DialogDescription>
              Select your role to access the appropriate dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {[
              {
                key: "admin" as const,
                title: "Admin",
                description: "Manage users, projects, and system settings.",
                icon: UserCog,
              },
              {
                key: "employee" as const,
                title: "Employee",
                description: "Work on assigned projects and deliverables.",
                icon: Briefcase,
              },
              {
                key: "client" as const,
                title: "Client",
                description: "Review updates, files, and invoices.",
                icon: Building2,
              },
            ].map((role) => (
              <Card
                key={role.key}
                role="button"
                tabIndex={0}
                className="cursor-pointer transition-colors hover:border-primary/50"
                onClick={() => handleRoleLogin(role.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRoleLogin(role.key);
                  }
                }}
              >
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-full bg-primary/10 p-3">
                    <role.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{role.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {role.description}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
