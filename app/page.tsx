"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Building2,
  Camera,
  Clapperboard,
  Coffee,
  Megaphone,
  Palette,
  Play,
  Rocket,
  Sparkles,
  Timer,
  UserCog,
} from "lucide-react"

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showLoginOptions, setShowLoginOptions] = useState(false)

  useEffect(() => {
    router.prefetch("/login")
  }, [router])

  const handleGetStarted = () => setShowLoginOptions(true)

  const handleRoleLogin = (role: "admin" | "employee" | "client") => {
    setIsLoading(true)
    setShowLoginOptions(false)
    router.push(`/login?role=${role}`)
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-[#050506] text-slate-50"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      <header
        className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/70"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <div className="container flex min-h-[80px] items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 shadow-lg shadow-amber-500/30">
              <Sparkles className="h-5 w-5 text-black" />
            </div>
            <div className="leading-tight">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Video-first studio</p>
              <p className="text-lg font-bold">The Lost Project</p>
            </div>
          </Link>
          <Button
            onClick={handleGetStarted}
            disabled={isLoading}
            className="gap-2 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-black shadow-lg shadow-amber-500/30"
          >
            {isLoading ? "Loading..." : "Get Started"}
            {!isLoading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-400/10 via-rose-500/5 to-transparent" />
          <div className="absolute -left-10 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl" />

          <div className="container relative px-4 pb-16 pt-14 md:px-6 md:pb-22 md:pt-20 lg:pb-28 lg:pt-24">
            <div className="max-w-4xl space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-amber-200">
                <Sparkles className="h-4 w-4" />
                <span>We&apos;re not your average agency</span>
              </div>

              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
                A vibrant, video-first crew crafting scroll-stopping, share-worthy stories.
              </h1>

              <p className="max-w-2xl text-lg text-slate-200/80 md:text-xl">
                From punchy reels to full-blown brand films, we deliver caffeine-fueled creativity with 24 hour drops, bold design, and performance thinking baked in.
              </p>

              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  disabled={isLoading}
                  className="gap-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 px-7 text-black shadow-lg shadow-amber-500/30"
                >
                  {isLoading ? "Loading..." : "Get Started"}
                  {!isLoading && <ArrowRight className="h-5 w-5" />}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleGetStarted}
                  className="gap-2 rounded-full border-white/30 bg-white/5 px-6 text-slate-100 hover:border-white/50"
                >
                  Play showreel
                  <Play className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-3">
                {[{ title: "24 hour drops", icon: Timer, blurb: "Express edits and reels when speed matters." }, { title: "Video-first thinking", icon: Clapperboard, blurb: "Concept to conversion with cinematic flair." }, { title: "Fueled by caffeine", icon: Coffee, blurb: "Obsession over details you can feel." }].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm shadow-black/20">
                    <div className="rounded-xl bg-white/10 p-2 text-amber-200">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-sm text-slate-200/70">{item.blurb}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 sm:grid-cols-3">
                {[
                  { label: "Video production", href: "https://www.thelostproject.in/collections/video-production" },
                  { label: "Social media", href: "https://www.thelostproject.in/collections/social-media" },
                  { label: "Design", href: "https://www.thelostproject.in/collections/design" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between rounded-xl bg-black/40 px-4 py-3 text-sm font-medium text-slate-100 transition-colors hover:bg-black/60"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>{item.label}</span>
                    <div className="flex items-center gap-2 text-amber-200">
                      <span className="text-xs uppercase tracking-[0.2em]">View</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/5 bg-[#0a0a0f] py-14 md:py-20">
          <div className="container space-y-6 px-4 md:px-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm uppercase tracking-[0.25em] text-amber-200/70">Collections</p>
              <h2 className="text-3xl font-semibold md:text-4xl">Shop the drops</h2>
              <p className="max-w-2xl text-slate-200/70">Pick a lane or mix-and-match. Everything ships with strategy, production, and post.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[{ title: "Video production", tag: "Films • Reels • Docs", accent: "from-amber-400/30 via-orange-500/20 to-rose-500/20" }, { title: "Social media", tag: "Always-on + Paid", accent: "from-cyan-400/25 via-sky-400/20 to-blue-500/20" }, { title: "Design", tag: "Brand + On-ground", accent: "from-violet-400/25 via-fuchsia-400/20 to-pink-400/20" }].map((item) => (
                <Card key={item.title} className="relative overflow-hidden border-white/10 bg-white/[0.04]">
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.accent} opacity-80`} />
                  <CardContent className="relative flex items-center justify-between gap-3 p-6">
                    <div>
                      <p className="text-sm uppercase tracking-[0.18em] text-white/80">{item.tag}</p>
                      <h3 className="text-2xl font-semibold text-white">{item.title}</h3>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/40 text-white">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/5 bg-black py-14 md:py-20">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-amber-200/70">Signature drops</p>
                <h2 className="text-3xl font-semibold md:text-4xl">Pick your package</h2>
              </div>
              <p className="max-w-xl text-slate-200/70">
                Choose a ready-to-roll drop or stitch a custom stack. Every package ships with strategy, production, and post built in.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {[{ title: "Brand Storyteller", price: "From ₹5K", icon: Megaphone, points: ["Concept to conversion films", "Hook-first scripts", "Launch-ready edits"] }, { title: "Power Shoot 24H", price: "Same-day", icon: Timer, points: ["1-day production sprint", "Reels + shorts pack", "Delivery in 24 hours"] }, { title: "Legacy Film", price: "Custom", icon: Rocket, points: ["Founder-led storytelling", "On-ground crew", "Cinematic grading"] }].map((item) => (
                <Card key={item.title} className="border-white/10 bg-white/[0.04] shadow-lg shadow-black/30">
                  <CardHeader className="space-y-1 pb-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-amber-200">
                      <item.icon className="h-4 w-4" />
                      <span>{item.price}</span>
                    </div>
                    <CardTitle className="text-2xl font-semibold">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-slate-200/80">
                    {item.points.map((point) => (
                      <div key={point} className="flex items-start gap-2">
                        <span className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
                        <p>{point}</p>
                      </div>
                    ))}
                    <Button
                      variant="secondary"
                      onClick={handleGetStarted}
                      className="mt-2 w-full justify-center rounded-full border-white/20 bg-white/10 text-slate-50 hover:border-white/40"
                    >
                      Book this drop
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/5 bg-[#0a0a0f] py-14 md:py-20">
          <div className="container px-4 md:px-6">
            <Card className="relative overflow-hidden border-white/10 bg-gradient-to-br from-amber-400/20 via-orange-500/15 to-rose-500/15 text-black">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_45%)]" />
              <CardContent className="relative space-y-4 p-10 text-slate-900 md:p-12">
                <h2 className="text-3xl font-semibold md:text-4xl">Let&apos;s make something scroll-stopping.</h2>
                <p className="max-w-2xl text-slate-900/80 md:text-lg">
                  Tell us the story you need to ship—brand film, product drop, social sprint—and we&apos;ll get the crew rolling.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    onClick={handleGetStarted}
                    disabled={isLoading}
                    className="gap-2 rounded-full bg-black px-7 text-white hover:bg-slate-900"
                  >
                    {isLoading ? "Loading..." : "Start a brief"}
                    {!isLoading && <ArrowRight className="h-5 w-5" />}
                  </Button>
                  <Link
                    href="https://www.thelostproject.in/work"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-slate-900/20 bg-white/80 px-6 py-3 text-slate-900 hover:border-slate-900/50"
                  >
                    See past work
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Dialog open={showLoginOptions} onOpenChange={setShowLoginOptions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Your Login Type</DialogTitle>
            <DialogDescription>
              Select your role to access the appropriate dashboard
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Card
              className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
              onClick={() => handleRoleLogin("admin")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <UserCog className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Admin</h3>
                  <p className="text-sm text-muted-foreground">Full system access and management</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
              onClick={() => handleRoleLogin("employee")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-blue-500/10 p-3">
                  <Briefcase className="h-6 w-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Employee</h3>
                  <p className="text-sm text-muted-foreground">Manage projects and tasks</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
              onClick={() => handleRoleLogin("client")}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-green-500/10 p-3">
                  <Building2 className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Client</h3>
                  <p className="text-sm text-muted-foreground">Track your projects and collaborate</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="w-full border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-6">
          <p className="text-center text-sm text-muted-foreground">© 2025 The Lost Project. All rights reserved.</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="#" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="#" className="transition-colors hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
