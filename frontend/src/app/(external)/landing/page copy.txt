"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BarChart2,
  Brain,
  ChevronRight,
  Code2,
  FileDown,
  Filter,
  Layers,
  Sparkles,
  UploadCloud,
  Zap,
  ArrowDown,
  Database,
  TrendingUp,
  Activity,
} from "lucide-react";

// ─── SVG Icons ────────────────────────────────────────────────────────────────
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

// ─── Data ─────────────────────────────────────────────────────────────────────
const TEAM_MEMBERS = [
  { id: 1, name: "Fityanandra Athar Adyaksa", nim: "52250059", role: "Data Scientist", linkedin: "https://www.linkedin.com/in/fityanandra?utm_source=share_via&utm_content=profile&utm_medium=member_android", github: "https://github.com/YanDraa", initials: "A" },
  { id: 2, name: "Kayla Aprilia", nim: "52250057", role: "ML Engineer", linkedin: "https://id.linkedin.com/in/kayla-aprilia-73182538a", github: "https://github.com/kayieeela", initials: "KA" },
  { id: 3, name: "Morris Alexander Pangaribuan", nim: "52250058", role: "Backend Developer", linkedin: "https://www.linkedin.com/in/morris-alexander-pangaribuan-40883a38a", github: "https://github.com/morrisalexanderpangaribuan-sketch", initials: "MP" },
  { id: 4, name: "Octavia Maia Rego", nim: "52250077", role: "Frontend Developer", linkedin: "https://www.linkedin.com/in/octavia-maia-r-2b064538a", github: "https://github.com/octaviamaia031-wq", initials: "OMR" },
  { id: 5, name: "Naifah Edria Arta", nim: "52250056", role: "Data Analyst", linkedin: "https://www.linkedin.com/in/naifah-edria-83460238a/", github: "https://github.com/naifahdria-hue", initials: "NEA" },
  { id: 6, name: "Zidhan Alfarezi Afdi", nim: "52250049", role: "UI/UX Designer", linkedin: "https://www.linkedin.com/in/zidhan-alfarezi-afdi-047b92344", github: "https://github.com/zidhan-08", initials: "ZAA" },
  { id: 7, name: "Syafif Azmi Lontoh", nim: "52250060", role: "UI/UX Designer", linkedin: "https://www.linkedin.com/in/syafif-azmi-lontoh-b2589a38b/", github: "https://github.com/Syafifazmi", initials: "SAL" },
];

const BENTO_FEATURES = [
  {
    icon: Filter,
    tag: "Pipeline 01",
    title: "Automated Cleaning Pipeline",
    desc: "Deteksi otomatis menghapus duplikat, memurnikan baris kosong, dan menampilkan telemetri peringatan secara instan — integritas data terjaga sebelum analisis dimulai.",
    accent: "lime",
    span: "lg:col-span-2",
    metric: "100%",
    metricLabel: "Data Integrity",
  },
  {
    icon: BarChart2,
    tag: "Pipeline 02",
    title: "Statistical Chart Recommender",
    desc: "Rule-based intelligence memilih dan merender chart Highcharts paling optimal sesuai tipe dan distribusi kolom data secara otomatis.",
    accent: "indigo",
    span: "lg:col-span-1",
    metric: "10+",
    metricLabel: "Chart Types",
  },
  {
    icon: Layers,
    tag: "Pipeline 03",
    title: "Multi-Surface Exploration",
    desc: "Navigasi mulus lintas Univariat, Bivariat, Multivariat, dan Time Series — semua permukaan analisis dalam satu antarmuka terpadu.",
    accent: "indigo",
    span: "lg:col-span-1",
    metric: "4",
    metricLabel: "Dimensi Analisis",
  },
  {
    icon: FileDown,
    tag: "Pipeline 04",
    title: "Executive Report Engine",
    desc: "Hasilkan narasi analitis lengkap berbasis Markdown, lalu ekspor ke PDF atau gambar langsung dari browser — tanpa server tambahan.",
    accent: "lime",
    span: "lg:col-span-2",
    metric: "3",
    metricLabel: "Format Ekspor",
  },
];

const PIPELINE_STEPS = [
  { label: "Upload Dataset", sub: "CSV · XLSX · TXT", icon: UploadCloud, step: "01" },
  { label: "Auto Cleaning", sub: "Dedup · Null Purge", icon: Filter, step: "02" },
  { label: "AI Analysis", sub: "Stats · Charts · Insight", icon: Brain, step: "03" },
  { label: "Export Report", sub: "PDF · PNG · Markdown", icon: FileDown, step: "04" },
];

const STATS = [
  { value: 3, suffix: "+", label: "Format File", icon: Database },
  { value: 10, suffix: "+", label: "Jenis Visualisasi", icon: BarChart2 },
  { value: 7, suffix: "", label: "Anggota Tim", icon: Activity },
  { value: 7, suffix: "+", label: "Fitur Analisis", icon: TrendingUp },
];

const TECH_STACK = ["Next.js", "FastAPI", "Python", "Pandas", "Highcharts", "Claude AI", "TypeScript", "Tailwind CSS"];

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const handler = () => setY(window.scrollY);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return y;
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "", active }: { target: number; suffix?: string; active: boolean }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    setCount(0);
    const duration = 1200;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(timer); return; }
      setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [active, target]);
  return <>{count}{suffix}</>;
}

// ─── Noise texture overlay ────────────────────────────────────────────────────
const noiseStyle: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
  backgroundRepeat: "repeat",
  backgroundSize: "128px 128px",
};

// ─── Grid pattern ─────────────────────────────────────────────────────────────
const gridStyleDark: React.CSSProperties = {
  backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
  backgroundSize: "60px 60px",
};

const gridStyleLight: React.CSSProperties = {
  backgroundImage: `linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)`,
  backgroundSize: "60px 60px",
};

// ─── Section wrapper with scroll animation ───────────────────────────────────
function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const scrollY = useScrollY();
  const statsSection = useInView(0.3);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navBlurred = scrollY > 40;

  return (
    <div className="min-h-screen overflow-x-hidden font-sans bg-white text-neutral-900 dark:bg-[#000000] dark:text-neutral-50 transition-colors duration-500">

      {/* ── Noise overlay ─────────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-0 dark:opacity-100" style={noiseStyle} aria-hidden />

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          navBlurred
            ? "border-b border-neutral-200/80 bg-white/85 backdrop-blur-xl dark:border-white/[0.06] dark:bg-black/80"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex size-8 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-[#deff9a] dark:text-black overflow-hidden">
              <Code2 className="relative z-10 size-4" />
            </div>
            <span className="text-sm font-bold tracking-tight">AutomationEDA</span>
          </div>

          {/* Nav links */}
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {[["#features", "Fitur"], ["#pipeline", "Pipeline"], ["#team", "Tim"]].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="relative text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50 group"
              >
                {label}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-[#deff9a] transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
            <Link
              href="/dashboard/upload-data"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all hover:scale-105
                bg-neutral-900 text-white hover:bg-neutral-800
                dark:bg-[#deff9a] dark:text-black dark:hover:bg-[#ccee88] dark:shadow-[0_0_20px_rgba(222,255,154,0.25)] dark:hover:shadow-[0_0_30px_rgba(222,255,154,0.4)]"
            >
              Buka Dashboard <ChevronRight className="size-3" />
            </Link>
          </nav>

          {/* Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/dashboard/upload-data"
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold bg-neutral-900 text-white dark:bg-[#deff9a] dark:text-black"
            >
              Dashboard <ChevronRight className="size-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-32 text-center">

        {/* Grid background */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-0 dark:opacity-100" style={gridStyleDark} aria-hidden />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-100 dark:opacity-0" style={gridStyleLight} aria-hidden />

        {/* Radial glows */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 size-[800px] rounded-full opacity-0 dark:opacity-100 bg-[#deff9a]/[0.07] blur-[160px] transition-opacity duration-700" />
          <div className="absolute top-1/3 left-1/4 size-[500px] rounded-full opacity-0 dark:opacity-100 bg-indigo-500/[0.06] blur-[130px] transition-opacity duration-700" />
          <div className="absolute top-1/3 right-1/4 size-[400px] rounded-full opacity-0 dark:opacity-100 bg-[#deff9a]/[0.05] blur-[110px] transition-opacity duration-700" />
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 size-[700px] rounded-full opacity-100 dark:opacity-0 bg-indigo-100/60 blur-[140px] transition-opacity duration-700" />
          <div className="absolute top-1/2 right-0 size-[400px] rounded-full opacity-100 dark:opacity-0 bg-lime-100/60 blur-[120px] transition-opacity duration-700" />
        </div>

        {/* Status badge */}
        <div
          className={`mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition-all duration-700
            border-neutral-200 bg-neutral-50/80 text-neutral-500
            dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-400
            ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <span className="size-1.5 rounded-full bg-[#deff9a] shadow-[0_0_8px_rgba(222,255,154,0.8)] animate-pulse" />
          Proyek UAS · Pemrograman Data Sains · 2025
        </div>

        {/* Headline */}
        <h1
          className={`mb-6 max-w-5xl text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[4.25rem] xl:text-[5rem] transition-all duration-700 delay-100
            ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
        >
          <span className="block text-neutral-900 dark:text-neutral-50">Analisis Data Tanpa</span>
          <span className="block">
            <span className="bg-gradient-to-r bg-clip-text text-transparent from-neutral-900 via-neutral-800 to-neutral-700 dark:from-[#deff9a] dark:via-[#c8f06a] dark:to-[#a8e063]">
              Batas. Tanpa Kode.
            </span>
          </span>
          <span className="block text-neutral-600 dark:text-neutral-400 text-3xl sm:text-4xl lg:text-[3.25rem] xl:text-[3.75rem] mt-1">
            Sepenuhnya Otomatis.
          </span>
        </h1>

        {/* Sub */}
        <p
          className={`mb-10 max-w-2xl text-balance text-base leading-relaxed sm:text-lg transition-all duration-700 delay-200 text-neutral-500 dark:text-neutral-400
            ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
        >
          AutomationEDA mengotomatiskan seluruh alur eksplorasi data — pembersihan dataset,
          rekomendasi chart berbasis AI, hingga laporan analitis siap ekspor —
          dalam satu agentic pipeline yang bekerja untuk Anda.
        </p>

        {/* CTA */}
        <div
          className={`flex flex-col items-center gap-3 sm:flex-row transition-all duration-700 delay-300
            ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
        >
          <Link
            href="/dashboard/upload-data"
            className="group inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5
              bg-neutral-900 text-white shadow-lg shadow-neutral-900/20 hover:shadow-neutral-900/40
              dark:bg-[#deff9a] dark:text-black dark:shadow-[0_8px_32px_rgba(222,255,154,0.25)] dark:hover:bg-[#eaff99] dark:hover:shadow-[0_12px_40px_rgba(222,255,154,0.4)]"
          >
            <Zap className="size-4 transition-transform group-hover:rotate-12" />
            Mulai Analisis Sekarang
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border px-7 py-3 text-sm font-medium transition-all hover:-translate-y-0.5
              border-neutral-300 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-400
              dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/[0.05] dark:hover:border-white/20"
          >
            Lihat Kemampuan
          </a>
        </div>

        {/* Stats row */}
        <div
          ref={statsSection.ref}
          className={`mt-20 flex flex-wrap items-center justify-center gap-10 sm:gap-16 transition-all duration-700 delay-500
            ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
        >
          {STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="group flex flex-col items-center text-center">
                <Icon className="mb-2 size-4 text-neutral-300 dark:text-neutral-700 transition-colors group-hover:text-neutral-500 dark:group-hover:text-neutral-400" />
                <div className="text-3xl font-extrabold tabular-nums tracking-tight text-neutral-900 dark:text-[#deff9a]">
                  {mounted ? (
                    <AnimatedCounter target={s.value} suffix={s.suffix} active={statsSection.inView} />
                  ) : "—"}
                </div>
                <div className="mt-1 text-[11px] font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-600">
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating mockup */}
        <div
          className={`mt-20 w-full max-w-4xl transition-all duration-1000 delay-700
            ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
        >
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl opacity-0 dark:opacity-100 bg-[#deff9a]/[0.06] blur-2xl" />
            <div
              className="relative overflow-hidden rounded-2xl border shadow-2xl
                border-neutral-200 bg-neutral-50
                dark:border-white/[0.07] dark:bg-[#0a0a0c] dark:shadow-[0_40px_80px_rgba(0,0,0,0.7)]"
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b px-4 py-3 border-neutral-200 bg-white dark:border-white/[0.05] dark:bg-[#0d0d0f]">
                <span className="size-2.5 rounded-full bg-red-400/80" />
                <span className="size-2.5 rounded-full bg-amber-400/80" />
                <span className="size-2.5 rounded-full bg-emerald-400/80" />
                <div className="ml-3 flex-1 rounded-md px-3 py-1 text-[11px] bg-neutral-100 text-neutral-400 dark:bg-white/5 dark:text-neutral-600">
                  automationeda.app/dashboard/upload-data
                </div>
              </div>
              {/* Dashboard body */}
              <div className="grid grid-cols-3 gap-3 p-5">
                <div className="col-span-1 flex flex-col gap-1.5">
                  {["Upload Data", "Univariat", "Bivariat", "Multivariat", "Time Series", "Laporan"].map((item, i) => (
                    <div
                      key={item}
                      className={`rounded-lg px-3 py-2 text-[11px] font-medium transition-all
                        ${i === 0
                          ? "bg-neutral-900 text-white dark:bg-[#deff9a] dark:text-black"
                          : "bg-neutral-100 text-neutral-400 dark:bg-white/5 dark:text-neutral-600"}`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
                <div className="col-span-2 flex flex-col gap-3">
                  <div className="flex gap-2">
                    {[["Baris", "12,480"], ["Kolom", "24"], ["Missing", "0"]].map(([label, val]) => (
                      <div
                        key={label}
                        className="flex-1 rounded-xl border p-3 border-neutral-200 bg-white dark:border-white/[0.07] dark:bg-white/[0.03]"
                      >
                        <div className="text-[9px] font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-600">{label}</div>
                        <div className="mt-1 text-base font-bold tabular-nums text-neutral-900 dark:text-[#deff9a]">{val}</div>
                      </div>
                    ))}
                  </div>
                  <div className="h-28 rounded-xl border flex items-end gap-1.5 px-4 pb-3 pt-3 border-neutral-200 bg-white dark:border-white/[0.07] dark:bg-white/[0.03]">
                    {[40, 65, 35, 80, 55, 90, 45, 70, 60, 85, 50, 75].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t overflow-hidden" style={{ height: `${h}%` }}>
                        <div
                          className="size-full rounded-t"
                          style={{
                            background: i % 3 === 0
                              ? "linear-gradient(to top, #deff9a80, #deff9a)"
                              : i % 3 === 1
                              ? "linear-gradient(to top, #818cf840, #818cf8)"
                              : "linear-gradient(to top, #6b728060, #9ca3af)",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className={`mt-16 flex flex-col items-center gap-2 transition-all duration-700 delay-[900ms]
            ${mounted ? "opacity-100" : "opacity-0"}`}
        >
          <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-300 dark:text-neutral-700">Scroll</span>
          <ArrowDown className="size-4 text-neutral-300 dark:text-neutral-700 animate-bounce" />
        </div>
      </section>

      {/* ── Pipeline Visual ────────────────────────────────────────────────── */}
      <section id="pipeline-hero" className="relative px-6 py-20 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 opacity-0 dark:opacity-100 bg-gradient-to-b from-black via-[#0a0a0c] to-black" />
          <div className="absolute inset-0 opacity-100 dark:opacity-0 bg-gradient-to-b from-neutral-50 via-white to-neutral-50" />
        </div>

        <div className="mx-auto max-w-5xl">
          <RevealSection className="mb-14 text-center">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-[#deff9a]">
              Cara Kerja
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Empat langkah.{" "}
              <span className="bg-gradient-to-r bg-clip-text text-transparent from-neutral-800 to-neutral-600 dark:from-[#deff9a] dark:to-indigo-400">
                Satu klik.
              </span>
            </h2>
          </RevealSection>

          <div className="relative grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="absolute left-[12.5%] right-[12.5%] top-[2.2rem] hidden h-px md:block">
              <div className="h-full bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-white/10" />
            </div>

            {PIPELINE_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <RevealSection key={step.label} delay={i * 120}>
                  <div className="group flex flex-col items-center text-center">
                    <div className="relative z-10 mb-4 flex size-[68px] items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-110
                      border-neutral-200 bg-white shadow-sm text-neutral-600 group-hover:border-neutral-400
                      dark:border-white/[0.1] dark:bg-[#0d0d0f] dark:text-neutral-400 dark:shadow-none dark:group-hover:border-[#deff9a]/40 dark:group-hover:text-[#deff9a] dark:group-hover:shadow-[0_0_24px_rgba(222,255,154,0.15)]"
                    >
                      <Icon className="size-6" />
                      <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full text-[9px] font-bold
                        bg-neutral-100 text-neutral-500
                        dark:bg-white/10 dark:text-neutral-500">
                        {step.step}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{step.label}</div>
                    <div className="mt-1 text-[11px] font-medium tracking-wide text-neutral-400 dark:text-neutral-600">{step.sub}</div>
                  </div>
                </RevealSection>
              );
            })}
          </div>

          <RevealSection delay={300} className="mt-14 flex flex-wrap justify-center gap-2">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all duration-200
                  border-neutral-200 bg-neutral-50 text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 hover:scale-105
                  dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-neutral-500 dark:hover:border-[#deff9a]/40 dark:hover:text-[#deff9a] dark:hover:bg-[#deff9a]/5"
              >
                {tech}
              </span>
            ))}
          </RevealSection>
        </div>
      </section>

      {/* ── Bento Features ────────────────────────────────────────────────── */}
      <section id="features" className="relative px-6 py-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 size-[600px] rounded-full opacity-0 dark:opacity-100 bg-indigo-500/[0.05] blur-[130px]" />
          <div className="absolute bottom-0 left-0 size-[400px] rounded-full opacity-0 dark:opacity-100 bg-[#deff9a]/[0.04] blur-[120px]" />
          <div className="absolute top-0 right-0 size-[500px] rounded-full opacity-100 dark:opacity-0 bg-indigo-50 blur-[120px]" />
        </div>

        <div className="mx-auto max-w-7xl">
          <RevealSection className="mb-16">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-[#deff9a]">
              Kapabilitas Platform
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                Empat pipeline yang bekerja{" "}
                <span className="bg-gradient-to-r bg-clip-text text-transparent from-neutral-900 to-neutral-500 dark:from-[#deff9a] dark:to-indigo-400">
                  secara otomatis.
                </span>
              </h2>
              <p className="max-w-xs text-sm leading-relaxed text-neutral-500 dark:text-neutral-500">
                Dari upload hingga laporan ekspor — semua berjalan tanpa intervensi manual.
              </p>
            </div>
          </RevealSection>

          <div className="grid gap-4 lg:grid-cols-3">
            {BENTO_FEATURES.map((f, i) => {
              const Icon = f.icon;
              const isLime = f.accent === "lime";
              return (
                <RevealSection key={f.tag} delay={i * 80} className={f.span}>
                  <div
                    className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl
                      border-neutral-200 bg-white shadow-sm hover:border-neutral-300
                      dark:border-white/[0.07] dark:bg-[#0a0a0c] dark:hover:border-white/[0.14] dark:hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                  >
                    <div className={`pointer-events-none absolute -right-12 -top-12 size-56 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 dark:block hidden ${isLime ? "bg-[#deff9a]/[0.08]" : "bg-indigo-500/[0.1]"}`} />

                    <div>
                      <div className="mb-6 flex items-start justify-between">
                        <div
                          className={`flex size-11 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-110
                            ${isLime
                              ? "border-neutral-200 bg-neutral-100 text-neutral-700 group-hover:border-lime-300 group-hover:bg-lime-50 group-hover:text-lime-700 dark:border-[#deff9a]/20 dark:bg-[#deff9a]/[0.08] dark:text-[#deff9a] dark:group-hover:bg-[#deff9a]/[0.15]"
                              : "border-neutral-200 bg-neutral-100 text-neutral-700 group-hover:border-indigo-300 group-hover:bg-indigo-50 group-hover:text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/[0.08] dark:text-indigo-400 dark:group-hover:bg-indigo-500/[0.15]"}`}
                        >
                          <Icon className="size-5" />
                        </div>
                        <span className="rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border-neutral-200 text-neutral-400 dark:border-white/10 dark:text-neutral-700">
                          {f.tag}
                        </span>
                      </div>

                      <h3 className="mb-3 text-base font-bold text-neutral-900 dark:text-neutral-50">{f.title}</h3>
                      <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-500">{f.desc}</p>
                    </div>

                    <div className="mt-8 flex items-end justify-between">
                      <div>
                        <div className={`text-2xl font-extrabold tabular-nums ${isLime ? "text-neutral-900 dark:text-[#deff9a]" : "text-neutral-900 dark:text-indigo-400"}`}>
                          {f.metric}
                        </div>
                        <div className="text-[10px] font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-600">{f.metricLabel}</div>
                      </div>
                      <div className={`h-px flex-1 mx-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isLime ? "bg-gradient-to-r from-transparent to-[#deff9a]/40 dark:to-[#deff9a]/60" : "bg-gradient-to-r from-transparent to-indigo-400/40 dark:to-indigo-400/60"}`} />
                      <ChevronRight className={`size-4 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5 ${isLime ? "text-neutral-400 dark:text-[#deff9a]" : "text-neutral-400 dark:text-indigo-400"}`} />
                    </div>
                  </div>
                </RevealSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Full Pipeline Section ──────────────────────────────────────────── */}
      <section id="pipeline" className="relative px-6 py-28 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 opacity-0 dark:opacity-100 bg-[#050507]" />
          <div className="absolute inset-0 opacity-100 dark:opacity-0 bg-neutral-50" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 size-[700px] rounded-full opacity-0 dark:opacity-100 bg-[#deff9a]/[0.04] blur-[160px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 size-[500px] rounded-full opacity-100 dark:opacity-0 bg-indigo-50 blur-[120px]" />
          <div className="absolute inset-0 opacity-0 dark:opacity-100" style={gridStyleDark} />
          <div className="absolute inset-0 opacity-100 dark:opacity-0" style={gridStyleLight} />
        </div>

        <div className="mx-auto max-w-7xl">
          <RevealSection className="mb-16 text-center">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-[#deff9a]">
              Alur Kerja End-to-End
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Dari data mentah ke insight matang
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-500">
              Empat tahap terotomatisasi berjalan tanpa intervensi manual. Anda cukup upload dataset dan biarkan pipeline bekerja.
            </p>
          </RevealSection>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <RevealSection key={step.label} delay={i * 100}>
                  <div className="group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1
                    border-neutral-200 bg-white shadow-sm
                    dark:border-white/[0.07] dark:bg-[#0d0d0f] dark:hover:border-[#deff9a]/20">
                    <div className="absolute -right-3 -top-3 text-[80px] font-black leading-none text-neutral-100 dark:text-white/[0.03] select-none pointer-events-none">
                      {step.step}
                    </div>
                    <div className="relative">
                      <div className="mb-4 flex size-12 items-center justify-center rounded-xl
                        bg-neutral-100 text-neutral-700
                        dark:bg-white/5 dark:text-neutral-400
                        group-hover:bg-neutral-900 group-hover:text-white
                        dark:group-hover:bg-[#deff9a] dark:group-hover:text-black
                        transition-all duration-300">
                        <Icon className="size-5" />
                      </div>
                      <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-1">{step.label}</div>
                      <div className="text-xs text-neutral-400 dark:text-neutral-600">{step.sub}</div>
                    </div>
                  </div>
                </RevealSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <RevealSection>
          <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border relative
            border-neutral-200 bg-white shadow-lg
            dark:border-white/[0.07] dark:bg-[#0a0a0c] dark:shadow-none">
            <div className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-100">
              <div className="absolute inset-0 bg-gradient-to-br from-[#deff9a]/[0.04] via-transparent to-indigo-500/[0.04]" />
            </div>
            <div className="pointer-events-none absolute inset-0 opacity-100 dark:opacity-0">
              <div className="absolute inset-0 bg-gradient-to-br from-lime-50/60 via-white to-indigo-50/60" />
            </div>

            <div className="relative p-12 text-center sm:p-16">
              <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl shadow-xl
                bg-neutral-900 text-white shadow-neutral-900/30
                dark:bg-[#deff9a] dark:text-black dark:shadow-[0_8px_32px_rgba(222,255,154,0.3)]">
                <Sparkles className="size-7" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                Siap Menganalisis Dataset Anda?
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                Upload dataset dan dapatkan insight mendalam lengkap dengan visualisasi interaktif dan laporan ekspor dalam hitungan detik.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/dashboard/upload-data"
                  className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5
                    bg-neutral-900 text-white shadow-lg shadow-neutral-900/20 hover:shadow-neutral-900/40
                    dark:bg-[#deff9a] dark:text-black dark:shadow-[0_8px_32px_rgba(222,255,154,0.25)] dark:hover:bg-[#eaff99] dark:hover:shadow-[0_12px_40px_rgba(222,255,154,0.4)]"
                >
                  Buka Upload Data <ChevronRight className="size-4" />
                </Link>
                <a
                  href="https://github.com/YanDraa/AutomationEDA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border px-8 py-3.5 text-sm font-medium transition-all hover:-translate-y-0.5
                    border-neutral-300 text-neutral-600 hover:bg-neutral-50
                    dark:border-white/10 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:border-white/20"
                >
                  <GithubIcon className="size-4" />
                  Lihat Source Code
                </a>
              </div>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ── Team (subtle, bottom) ─────────────────────────────────────────── */}
      <section id="team" className="px-6 py-20 border-t border-neutral-100 dark:border-white/[0.04]">
        <div className="mx-auto max-w-7xl">
          <RevealSection className="mb-10 text-center">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-[#deff9a]">
              Dikerjakan oleh
            </p>
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Tim Pengembang</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-500">
              Tujuh mahasiswa yang berkolaborasi membangun AutomationEDA sebagai proyek akhir semester mata kuliah Pemrograman Data Sains.
            </p>
          </RevealSection>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {TEAM_MEMBERS.map((member, index) => {
              const isLast = index === TEAM_MEMBERS.length - 1;
              return (
                <RevealSection key={member.id} delay={index * 60}>
                  <div
                    className={`group flex items-center gap-3 rounded-xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md
                      border-neutral-200 bg-white shadow-sm hover:border-neutral-300
                      dark:border-white/[0.06] dark:bg-[#0a0a0c] dark:hover:border-white/[0.1] dark:hover:shadow-black/40
                      ${isLast ? "sm:col-span-2 lg:col-span-1 xl:col-span-1" : ""}`}
                  >
                    <div className="relative shrink-0 size-10">
                      <img
                        src={`${member.github}.png?size=80`}
                        alt={member.name}
                        width={40}
                        height={40}
                        className="size-10 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-white/10"
                        onError={(e) => {
                          const el = e.currentTarget;
                          el.style.display = "none";
                          const fallback = el.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                      <div
                        style={{ display: "none" }}
                        className="absolute inset-0 items-center justify-center rounded-full text-[10px] font-bold ring-1 bg-neutral-100 text-neutral-700 ring-neutral-200 dark:bg-neutral-800 dark:text-[#deff9a] dark:ring-white/10"
                      >
                        {member.initials}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">{member.name}</div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-500">{member.role}</div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`LinkedIn ${member.name}`}
                        className="flex size-6 items-center justify-center rounded-lg border transition-colors border-neutral-200 text-neutral-400 hover:border-neutral-400 hover:text-neutral-700 dark:border-white/10 dark:text-neutral-600 dark:hover:border-white/20 dark:hover:text-neutral-300"
                      >
                        <LinkedinIcon className="size-3" />
                      </a>
                      <a
                        href={member.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`GitHub ${member.name}`}
                        className="flex size-6 items-center justify-center rounded-lg border transition-colors border-neutral-200 text-neutral-400 hover:border-neutral-400 hover:text-neutral-700 dark:border-white/10 dark:text-neutral-600 dark:hover:border-white/20 dark:hover:text-neutral-300"
                      >
                        <GithubIcon className="size-3" />
                      </a>
                    </div>
                  </div>
                </RevealSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t px-6 py-8 border-neutral-200 dark:border-white/[0.05]">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 text-center text-xs sm:flex-row sm:justify-between">
          <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-neutral-100">
            <div className="flex size-5 items-center justify-center rounded bg-neutral-900 text-white dark:bg-[#deff9a] dark:text-black">
              <Code2 className="size-3" />
            </div>
            AutomationEDA
          </div>
          <p className="text-neutral-400 dark:text-neutral-700">
            © {new Date().getFullYear()} · Proyek UAS Pemrograman Data Sains
          </p>
          <Link
            href="/dashboard/upload-data"
            className="text-neutral-400 transition-colors hover:text-neutral-900 dark:text-neutral-700 dark:hover:text-[#deff9a]"
          >
            Buka Dashboard →
          </Link>
        </div>
      </footer>
    </div>
  );
}