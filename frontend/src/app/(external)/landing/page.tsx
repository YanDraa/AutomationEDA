"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  BarChart2,
  Brain,
  ChevronRight,
  Code2,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";

// SVG Icons (LinkedIn & GitHub not in this lucide-react version)
function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

// ─── Team Data ───────────────────────────────────────────────────────────────
const TEAM_MEMBERS = [
  {
    id: 1,
    name: "Fityanandra Athar Adyaksa ",
    nim: "52250059",
    role: "Data Scientist",
    linkedin: "https://www.linkedin.com/in/fityanandra?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    github: "https://github.com/YanDraa",
    initials: "A",
  },
  {
    id: 2,
    name: "Kayla Aprilia",
    nim: "52250057",
    role: "ML Engineer",
    linkedin: "https://id.linkedin.com/in/kayla-aprilia-73182538a",
    github: "https://github.com/kayieeela",
    initials: "KA",
  },
  {
    id: 3,
    name: "Morris Alexander Pangaribuan",
    nim: "52250058",
    role: "Backend Developer",
    linkedin: "https://www.linkedin.com/in/morris-alexander-pangaribuan-40883a38a?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    github: "https://github.com/morrisalexanderpangaribuan-sketch",
    initials: "MP",
  },
  {
    id: 4,
    name: "Octavia Maia Rego",
    nim: "52250077",
    role: "Frontend Developer",
    linkedin: "https://www.linkedin.com/in/octavia-maia-r-2b064538a",
    github: "https://github.com/octaviamaia031-wq",
    initials: "OMR",
  },
  {
    id: 5,
    name: "Anggota Kelima",
    nim: "123456005",
    role: "Data Analyst",
    linkedin: "https://linkedin.com/in/anggota-kelima",
    github: "https://github.com/anggota-kelima",
    initials: "AK",
  },
  {
    id: 6,
    name: "Anggota Keenam",
    nim: "123456006",
    role: "UI/UX Designer",
    linkedin: "https://linkedin.com/in/anggota-keenam",
    github: "https://github.com/anggota-keenam",
    initials: "AK",
  },
  {
    id: 7,
    name: "Anggota Keenam",
    nim: "123456006",
    role: "UI/UX Designer",
    linkedin: "https://linkedin.com/in/anggota-keenam",
    github: "https://github.com/anggota-keenam",
    initials: "AK",
  },
];

const FEATURES = [
  {
    icon: UploadCloud,
    title: "Upload Mudah",
    desc: "Dukung format CSV, XLSX, dan TXT. Cukup drag & drop.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: BarChart2,
    title: "Statistik Deskriptif",
    desc: "Analisis numerik dan kategorikal secara otomatis.",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: Zap,
    title: "Visualisasi Interaktif",
    desc: "Grafik univariat, bivariat, multivariat, hingga time series.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Brain,
    title: "Interpretasi AI",
    desc: "Dapatkan insight otomatis dari data Anda menggunakan AI.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
];

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const step = Math.ceil(target / 60);
    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev + step >= target) {
          clearInterval(timer);
          return target;
        }
        return prev + step;
      });
    }, 16);
    return () => clearInterval(timer);
  }, [target]);
  return (
    <span>
      {count}
      {suffix}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Code2 className="size-4" />
            </div>
            <span className="font-bold text-lg tracking-tight">AutomationEDA</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Fitur</a>
            <a href="#team" className="hover:text-foreground transition-colors">Tim</a>
            <Link
              href="/dashboard/upload-data"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Buka Dashboard <ChevronRight className="size-3.5" />
            </Link>
          </nav>
          {/* Mobile CTA */}
          <Link
            href="/dashboard"
            className="md:hidden inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Dashboard <ChevronRight className="size-3" />
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-20 pb-16 text-center overflow-hidden">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden
        >
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-blue-500/10 blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 size-[400px] rounded-full bg-violet-500/10 blur-[100px]" />
          <div className="absolute top-1/3 right-1/4 size-[400px] rounded-full bg-emerald-500/8 blur-[100px]" />
        </div>

        {/* Badge */}
        <div
          className={`mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          <Sparkles className="size-3 text-amber-500" />
          Proyek UAS Pemrograman Data Sains · 2025
        </div>

        {/* Heading */}
        <h1
          className={`mb-6 max-w-4xl text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl transition-all duration-700 delay-100 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          Eksplorasi Data{" "}
          <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 bg-clip-text text-transparent">
            Otomatis
          </span>{" "}
          &amp; Cerdas
        </h1>

        <p
          className={`mb-10 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg transition-all duration-700 delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          AutomationEDA adalah platform analisis data eksploratif berbasis AI yang
          mengotomatiskan proses statistik deskriptif, visualisasi, dan interpretasi
          dataset secara instan — tanpa perlu menulis kode.
        </p>

        {/* CTA Buttons */}
        <div
          className={`flex flex-col items-center gap-3 sm:flex-row transition-all duration-700 delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          <Link
            href="/dashboard/upload-data"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
          >
            <Zap className="size-4" />
            Mulai Sekarang
          </Link>

          <a
            href="#team"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-all"
          >
            Kenali Tim Kami
          </a>
        </div>

        {/* Stats */}
        <div
          className={`mt-16 flex flex-wrap items-center justify-center gap-10 text-center transition-all duration-700 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          {[
            { label: "Format File", value: 3, suffix: "+" },
            { label: "Jenis Visualisasi", value: 10, suffix: "+" },
            { label: "Anggota Tim", value: 7, suffix: "" },
            { label: "Fitur Analisis", value: 7, suffix: "+" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-foreground">
                {mounted ? <AnimatedCounter target={s.value} suffix={s.suffix} /> : `0${s.suffix}`}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Kemampuan Platform
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Semua yang Anda butuhkan
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
              Dari upload data hingga insight AI — semuanya terintegrasi dalam satu platform yang mudah digunakan.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-border/80"
                >
                  <div className={`flex size-11 items-center justify-center rounded-xl ${f.bg}`}>
                    <Icon className={`size-5 ${f.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{f.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section id="team" className="relative py-24 px-6">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 size-[500px] rounded-full bg-violet-500/8 blur-[120px]" />
        </div>

        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Dibuat oleh
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Tim Pengembang</h2>
            <p className="mt-4 max-w-lg mx-auto text-muted-foreground text-sm">
              Tujuh mahasiswa yang berkolaborasi membangun AutomationEDA sebagai proyek
              akhir semester mata kuliah Pemrograman Data Sains.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM_MEMBERS.map((member, index) => {
              const isLast = index === TEAM_MEMBERS.length - 1;
              return (
                <div
                  key={member.id}
                  className={`group flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-all duration-200 hover:shadow-md hover:bg-muted/20 ${
                    isLast ? "sm:col-span-2 lg:col-span-1 lg:col-start-2" : ""
                  }`}
                >
                {/* Avatar */}
                <div className="relative shrink-0 size-14">
                  <img
                    src={`${member.github}.png?size=120`}
                    alt={`Foto ${member.name}`}
                    width={56}
                    height={56}
                    className="size-14 rounded-full object-cover ring-1 ring-border"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = "none";
                      const fallback = el.nextElementSibling as HTMLElement | null;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                  {/* Fallback inisial */}
                  <div
                    style={{ display: "none" }}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-muted text-foreground text-sm font-semibold ring-1 ring-border"
                  >
                    {member.initials}
                  </div>
                </div>

                {/* Info */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <h3 className="truncate text-sm font-semibold text-foreground">{member.name}</h3>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                  <p className="font-mono text-xs text-muted-foreground/70">{member.nim}</p>
                </div>

                {/* Links */}
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`LinkedIn ${member.name}`}
                    className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <LinkedinIcon className="size-3.5" />
                  </a>
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`GitHub ${member.name}`}
                    className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <GithubIcon className="size-3.5" />
                  </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-border bg-gradient-to-br from-card to-muted/30 p-12 text-center shadow-sm">
          <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg">
            <Sparkles className="size-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Siap Menganalisis Data?</h2>
          <p className="mt-3 text-muted-foreground">
            Upload dataset Anda dan dapatkan insight mendalam dalam hitungan detik.
          </p>
          <Link
            href="/dashboard/upload-data"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-primary/30 transition-all"
          >
            Buka Upload Data <ChevronRight className="size-4" />
          </Link>

        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="mx-auto max-w-7xl flex flex-col items-center gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Code2 className="size-3.5" />
            AutomationEDA
          </div>
          <p>© {new Date().getFullYear()} · Proyek UAS Pemrograman Data Sains</p>
          <Link
            href="/dashboard/upload-data"
            className="hover:text-foreground transition-colors"
          >
            Buka Upload Data →
          </Link>

        </div>
      </footer>
    </div>
  );
}
