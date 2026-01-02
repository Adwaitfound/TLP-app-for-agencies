"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  FileText,
  FolderKanban,
  Users,
  Zap,
} from "lucide-react";

export default function Home() {

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

          <Button asChild className="gap-2 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90">
            <Link href="/login">
              Login
            </Link>
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
                  preload="none"
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
                  Every brand has a{" "}
                  <span className="bg-gradient-to-r from-primary via-primary/70 to-primary/40 bg-clip-text text-transparent">
                    unique journey
                  </span>
                </h1>
                <p className="mx-auto max-w-[700px] text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
                  We're your partners in shaping that story. Through innovation and collaboration, we'll create a digital narrative that captivates and inspires. Video-first agency obsessed with crafting content that's as captivating as it is impactful.
                </p>
              </div>

              <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:justify-center">
                <Button
                  size="lg"
                  asChild
                  className="w-full gap-2 rounded-full bg-primary px-8 text-primary-foreground hover:bg-primary/90 sm:w-auto"
                >
                  <Link href="/signup?role=client">
                    Get Started
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  asChild
                  className="w-full gap-2 rounded-full px-8 sm:w-auto"
                >
                  <Link href="/agency-onboarding">
                    Agency Onboarding
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="w-full rounded-full bg-transparent px-8 sm:w-auto"
                >
                  <Link href="/login">Login</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full border-t bg-background py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Our Services
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Powerful solutions designed to elevate your brand
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Video Production",
                  description:
                    "From pre-production to post, we craft narratives that resonate. Our production process is a seamless blend of innovation, precision, and passion.",
                  icon: FolderKanban,
                },
                {
                  title: "Branding & Design",
                  description:
                    "Packaging and branding wizards obsessed with creating designs that pop. From concept to shelf, we craft designs that connect with your audience.",
                  icon: Users,
                },
                {
                  title: "Digital Marketing",
                  description:
                    "Strategic social media consulting aligned with digital platforms. Data-driven insights that optimize your online presence and achieve marketing objectives.",
                  icon: FileText,
                },
                {
                  title: "Project Management",
                  description:
                    "Track all your projects from planning to completion with intuitive dashboards, real-time progress tracking, and seamless team collaboration.",
                  icon: BarChart3,
                },
                {
                  title: "Client Collaboration",
                  description:
                    "Share files, collect feedback, and communicate seamlessly with clients in real-time through our dedicated collaboration platform.",
                  icon: CheckCircle,
                },
                {
                  title: "Influencer Marketing",
                  description:
                    "Partner with influential individuals to exponentially increase your digital reach. We excel at identifying perfect influencers to amplify your brand's message.",
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
                  Feeling a little LOST?
                </h2>
                <p className="max-w-[720px] text-lg text-muted-foreground">
                  Join brands who trust The Lost Project to bring their visions to life. With over 10+ years of experience, we're ready to redefine your brand's presence.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    asChild
                    className="gap-2 rounded-full bg-primary px-8 text-primary-foreground hover:bg-primary/90"
                  >
                    <Link href="/signup?role=client">
                      Get Started
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    asChild
                    className="gap-2 rounded-full px-8"
                  >
                    <Link href="/agency-onboarding">
                      Agency Onboarding
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="gap-2 rounded-full px-8"
                  >
                    <Link href="https://www.thelostproject.xyz" target="_blank">
                      See Our Work
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="gap-2 rounded-full px-8"
                  >
                    <Link href="https://www.thelostproject.in" target="_blank">
                      Book Services
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="w-full border-t bg-background py-6">
        <div className="container flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row md:px-6">
          <div>© 2025 The Lost Project. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <Link href="https://www.instagram.com/thelostprojectt/" target="_blank" className="hover:text-foreground">
              Instagram
            </Link>
            <Link href="https://in.linkedin.com/company/thelostproject" target="_blank" className="hover:text-foreground">
              LinkedIn
            </Link>
            <Link href="https://www.thelostproject.xyz/applicationform" target="_blank" className="hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
