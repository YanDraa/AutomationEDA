"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useInView as useFmInView,
} from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  Brain,
  ChevronRight,
  CircleDot,
  Database,
  FileDown,
  Filter,
  Layers,
  LineChart,
  Sparkles,
  Sparkle,
  TrendingUp,
  UploadCloud,
  Wand2,
  Zap,
  Cpu,
  Activity,
  LogIn,
  Eye,
  EyeOff,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";


/* ────────────────────────────────────────────────────────────────────────────
 * BRAND ICONS (inline — lucide-react removed brand icons in recent versions)
 * ──────────────────────────────────────────────────────────────────────── */

function Github({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function Linkedin({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * DATA
 * ──────────────────────────────────────────────────────────────────────── */

const TEAM_MEMBERS = [
  { id: 1, name: "Fityanandra Athar Adyaksa", nim: "52250059", role: "Data Scientist", linkedin: "https://www.linkedin.com/in/fityanandra", github: "https://github.com/YanDraa", initials: "FA" },
  { id: 2, name: "Kayla Aprilia", nim: "52250057", role: "ML Engineer", linkedin: "https://id.linkedin.com/in/kayla-aprilia-73182538a", github: "https://github.com/kayieeela", initials: "KA" },
  { id: 3, name: "Morris Alexander Pangaribuan", nim: "52250058", role: "Backend Developer", linkedin: "https://www.linkedin.com/in/morris-alexander-pangaribuan-40883a38a", github: "https://github.com/morrisalexanderpangaribuan-sketch", initials: "MP" },
  { id: 4, name: "Octavia Maia Rego", nim: "52250077", role: "Frontend Developer", linkedin: "https://www.linkedin.com/in/octavia-maia-r-2b064538a", github: "https://github.com/octaviamaia031-wq", initials: "OM" },
  { id: 5, name: "Naifah Edria Arta", nim: "52250056", role: "Data Analyst", linkedin: "https://www.linkedin.com/in/naifah-edria-83460238a/", github: "https://github.com/naifahdria-hue", initials: "NA" },
  { id: 6, name: "Zidhan Alfarezi Afdi", nim: "52250049", role: "UI/UX Designer", linkedin: "https://www.linkedin.com/in/zidhan-alfarezi-afdi-047b92344", github: "https://github.com/zidhan-08", initials: "ZA" },
  { id: 7, name: "Syafif Azmi Lontoh", nim: "52250060", role: "UI/UX Designer", linkedin: "https://www.linkedin.com/in/syafif-azmi-lontoh-b2589a38b/", github: "https://github.com/Syafifazmi", initials: "SL" },
];

const STATS = [
  { value: 3, suffix: "+", label: "Format File", icon: Database },
  { value: 10, suffix: "+", label: "Jenis Visualisasi", icon: BarChart2 },
  { value: 4, suffix: "", label: "Dimensi Analisis", icon: Layers },
  { value: 7, suffix: "+", label: "Fitur Otomatis", icon: TrendingUp },
];

const PIPELINE_STEPS = [
  { step: "01", label: "Upload Dataset", sub: "CSV · XLSX · TXT", icon: UploadCloud, detail: "Drag & drop file — sistem mendeteksi skema, tipe data, dan struktur secara otomatis." },
  { step: "02", label: "Auto Cleaning", sub: "Dedup · Null Purge", icon: Filter, detail: "Pipeline membersihkan duplikat, baris kosong, dan anomali dengan telemetri real-time." },
  { step: "03", label: "AI Analysis", sub: "Stats · Charts · Insight", icon: Brain, detail: "Rule-based engine memilih visualisasi optimal dan menghasilkan insight naratif." },
  { step: "04", label: "Export Report", sub: "PDF · PNG · Markdown", icon: FileDown, detail: "Ekspor laporan eksekutif dalam tiga format — siap dipresentasikan ke stakeholder." },
];

const BENTO_FEATURES = [
  {
    icon: Filter,
    tag: "01 · Pipeline",
    title: "Automated Cleaning Pipeline",
    desc: "Deteksi otomatis menghapus duplikat, memurnikan baris kosong, dan menampilkan telemetri peringatan secara instan.",
    metric: "100%",
    metricLabel: "Data Integrity",
    span: "md:col-span-2 md:row-span-2",
    accent: "primary",
  },
  {
    icon: BarChart2,
    tag: "02 · Intelligence",
    title: "Statistical Chart Recommender",
    desc: "Rule-based intelligence memilih dan merender chart Highcharts paling optimal sesuai distribusi kolom.",
    metric: "10+",
    metricLabel: "Chart Types",
    span: "md:col-span-1 md:row-span-1",
    accent: "muted",
  },
  {
    icon: Layers,
    tag: "03 · Exploration",
    title: "Multi-Surface Exploration",
    desc: "Navigasi mulus lintas Univariat, Bivariat, Multivariat, dan Time Series — terpadu dalam satu antarmuka.",
    metric: "4",
    metricLabel: "Dimensi Analisis",
    span: "md:col-span-1 md:row-span-1",
    accent: "muted",
  },
  {
    icon: Wand2,
    tag: "04 · Reporting",
    title: "Executive Report Engine",
    desc: "Narasi analitis lengkap berbasis Markdown, lalu ekspor ke PDF atau gambar langsung dari browser.",
    metric: "3",
    metricLabel: "Format Ekspor",
    span: "md:col-span-1 md:row-span-1",
    accent: "primary",
  },
  {
    icon: Brain,
    tag: "05 · AI Core",
    title: "Insight Generation",
    desc: "Gemini AI mengubah hasil statistik mentah menjadi insight bisnis yang dapat ditindaklanjuti.",
    metric: "AI",
    metricLabel: "Powered",
    span: "md:col-span-2 md:row-span-1",
    accent: "muted",
  },
  {
    icon: Cpu,
    tag: "06 · Performance",
    title: "Browser-Native Compute",
    desc: "Semua proses berjalan di sisi klien — tanpa server tambahan, tanpa latensi jaringan.",
    metric: "0ms",
    metricLabel: "Server Latency",
    span: "md:col-span-3 md:row-span-1",
    accent: "muted",
  },
];

const TECH_STACK = ["Next.js", "FastAPI", "Python", "Pandas", "Highcharts", "Claude AI", "TypeScript", "Tailwind"];

const FLOATING_INSIGHTS = [
  { label: "Correlation", value: "0.87", trend: "+12%", icon: TrendingUp },
  { label: "Missing", value: "0.4%", trend: "-3.1%", icon: CircleDot },
  { label: "Outliers", value: "23", trend: "detected", icon: Sparkle },
  { label: "Variance", value: "1.42", trend: "stable", icon: Activity },
];

/* ────────────────────────────────────────────────────────────────────────────
 * HOOKS
 * ──────────────────────────────────────────────────────────────────────── */

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function useAnimatedNumber(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return value;
}

/* ────────────────────────────────────────────────────────────────────────────
 * PRIMITIVES
 * ──────────────────────────────────────────────────────────────────────── */

/** Magnetic button — pulls toward cursor on hover */
function MagneticWrap({
  children,
  strength = 0.25,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 250, damping: 18, mass: 0.4 });

  const onMove = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);
      x.set(relX * strength);
      y.set(relY * strength);
    },
    [strength, x, y],
  );

  const onLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Reveal on scroll */
function Reveal({
  children,
  delay = 0,
  y = 24,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useFmInView(ref, { once: true, margin: "-10% 0px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Animated count-up that activates when in view */
function StatNumber({ target, suffix }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useFmInView(ref, { once: true, margin: "-20% 0px" });
  const v = useAnimatedNumber(target, inView);
  return (
    <span ref={ref} className="tabular-nums">
      {Math.round(v)}
      {suffix}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * BACKGROUND LAYERS
 * ──────────────────────────────────────────────────────────────────────── */

const gridStyle: CSSProperties = {
  backgroundImage: `linear-gradient(to right, color-mix(in oklch, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 8%, transparent) 1px, transparent 1px)`,
  backgroundSize: "56px 56px",
  maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 75%)",
  WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 75%)",
};

const noiseStyle: CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E")`,
};

/* ────────────────────────────────────────────────────────────────────────────
 * SPOTLIGHT CURSOR (Hero)
 * ──────────────────────────────────────────────────────────────────────── */

function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const sx = useSpring(mx, { stiffness: 120, damping: 20, mass: 0.5 });
  const sy = useSpring(my, { stiffness: 120, damping: 20, mass: 0.5 });

  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      mx.set(e.clientX - rect.left);
      my.set(e.clientY - rect.top);
    };
    const onLeave = () => {
      mx.set(-400);
      my.set(-400);
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [mx, my]);

  const bg = useTransform(
    [sx, sy],
    ([x, y]: number[]) =>
      `radial-gradient(420px circle at ${x}px ${y}px, color-mix(in oklch, var(--primary) 18%, transparent), transparent 65%)`,
  );

  return (
    <motion.div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1]"
      style={{ background: bg }}
    />
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * AI CORE VISUALIZATION
 * Animated orbital rings with floating insight chips
 * ──────────────────────────────────────────────────────────────────────── */

function AICore() {
  return (
    <div className="relative mx-auto h-[440px] w-full max-w-[520px]" data-testid="ai-core-visual">
      {/* Outer rings */}
      {[1, 2, 3].map((r, i) => (
        <motion.div
          key={r}
          aria-hidden
          className="absolute inset-0 m-auto rounded-full border border-foreground/10"
          style={{
            width: 200 + i * 90,
            height: 200 + i * 90,
            top: "50%",
            left: "50%",
            translateX: "-50%",
            translateY: "-50%",
          }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ repeat: Infinity, duration: 28 + i * 10, ease: "linear" }}
        >
          <div
            className="absolute h-2 w-2 rounded-full bg-primary shadow-[0_0_18px_var(--primary)]"
            style={{ top: -4, left: "50%", transform: "translateX(-50%)" }}
          />
        </motion.div>
      ))}

      {/* Pulsing halo */}
      <motion.div
        aria-hidden
        className="absolute inset-0 m-auto rounded-full"
        style={{
          width: 180,
          height: 180,
          top: "50%",
          left: "50%",
          translateX: "-50%",
          translateY: "-50%",
          background: "radial-gradient(circle, color-mix(in oklch, var(--primary) 35%, transparent), transparent 70%)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Core node */}
      <motion.div
        className="absolute inset-0 m-auto flex h-28 w-28 items-center justify-center rounded-full border border-primary/30 bg-background/80 backdrop-blur-md"
        style={{ top: "50%", left: "50%", translateX: "-50%", translateY: "-50%" }}
        animate={{ boxShadow: ["0 0 30px var(--primary)", "0 0 60px var(--primary)", "0 0 30px var(--primary)"] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Brain className="h-12 w-12 text-primary" strokeWidth={1.4} />
      </motion.div>

      {/* Floating insight chips */}
      {FLOATING_INSIGHTS.map((ins, i) => {
        const angle = (i / FLOATING_INSIGHTS.length) * Math.PI * 2;
        const radius = 175;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const Icon = ins.icon;
        return (
          <motion.div
            key={ins.label}
            className="absolute z-10 flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur-md"
            style={{
              top: "50%",
              left: "50%",
              translateX: `calc(-50% + ${x}px)`,
              translateY: `calc(-50% + ${y}px)`,
            }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
            transition={{
              opacity: { delay: 0.4 + i * 0.15, duration: 0.5 },
              scale: { delay: 0.4 + i * 0.15, duration: 0.5 },
              y: { duration: 3 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 },
            }}
            data-testid={`floating-insight-${ins.label.toLowerCase()}`}
          >
            <Icon className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">{ins.label}</span>
            <span className="font-mono text-foreground">{ins.value}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * LIVE DASHBOARD MOCKUP
 * ──────────────────────────────────────────────────────────────────────── */

function LiveDashboard() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(id);
  }, []);

  const bars = Array.from({ length: 14 }, (_, i) => {
    const base = 30 + ((i * 13 + tick * 9) % 65);
    return base;
  });

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border bg-card/70 shadow-2xl backdrop-blur-xl"
      data-testid="live-dashboard-mockup"
    >
      {/* chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        <div className="ml-3 flex flex-1 items-center gap-2 rounded-md bg-background/60 px-3 py-1 font-mono text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          automationeda.app / dashboard / analysis
        </div>
      </div>

      {/* body */}
      <div className="grid grid-cols-12 gap-3 p-4">
        {/* Sidebar */}
        <div className="col-span-3 space-y-1.5">
          {["Upload", "Univariat", "Bivariat", "Multivariat", "Time Series", "Laporan"].map((it, i) => (
            <div
              key={it}
              className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] ${
                i === 2 ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${i === 2 ? "bg-primary" : "bg-foreground/20"}`} />
              {it}
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div className="col-span-9 space-y-3">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Baris", "12,480"],
              ["Kolom", "24"],
              ["Missing", "0.4%"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border bg-background/50 p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</div>
                <div className="mt-0.5 font-mono text-sm font-semibold text-foreground">{v}</div>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="relative h-32 rounded-lg border border-border bg-background/50 p-3">
            <div className="absolute right-3 top-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Distribution · Live
            </div>
            <div className="flex h-full items-end gap-1.5 pt-4">
              {bars.map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-sm bg-primary/70"
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              ))}
            </div>
          </div>

          {/* Insight strip */}
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] text-foreground">
              <span className="text-muted-foreground">Insight:</span> kolom <span className="font-mono">revenue</span>{" "}
              berkorelasi kuat dengan <span className="font-mono">marketing_spend</span>{" "}
              <span className="text-primary">(r = 0.87)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * PAGE
 * ──────────────────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────────────────────
 * LOGIN DIALOG
 * ──────────────────────────────────────────────────────────────────────── */

function LoginDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        onOpenChange(false);
        router.push("/dashboard/upload-data");
      } else {
        setError(data.detail || "Email atau password salah. Silakan coba lagi.");
      }
    } catch {
      setError("Gagal terhubung ke server. Pastikan backend berjalan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-primary" />
            Login ke AutomationEDA
          </DialogTitle>
          <DialogDescription>
            Masukkan kredensial untuk melanjutkan ke dashboard analisis.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-sm font-medium">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="test@test.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-sm font-medium">Password</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
                className="h-9 w-full rounded-md border border-border bg-background px-3 pr-9 text-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-sm font-medium text-background transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {loading ? "Memproses..." : "Masuk"}
          </button>

          <div className="mt-2 rounded-md border border-border bg-muted/50 p-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Akun testing:</p>
            <div className="space-y-1 text-[11px] text-muted-foreground font-mono">
              <p>test@test.com / test123</p>
              <p>hello@arhamkhnz.com / admin123</p>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * PAGE
 * ──────────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const mounted = useMounted();
  const { scrollY } = useScroll();
  const [navBlur, setNavBlur] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    return scrollY.on("change", (y) => setNavBlur(y > 24));
  }, [scrollY]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground antialiased">
      {/* Global noise */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025] mix-blend-overlay"
        style={noiseStyle}
      />

      {/* ──────────── NAV ──────────── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          navBlur ? "border-b border-border/60 bg-background/70 backdrop-blur-xl" : ""
        }`}
        data-testid="landing-navbar"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="group flex items-center gap-2.5" data-testid="nav-logo">
            <div className="relative">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <motion.div
                aria-hidden
                className="absolute inset-0 rounded-lg bg-primary/30 blur-md"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight">AutomationEDA</span>
              <span className="text-[10px] text-muted-foreground">AI-Native Analysis</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            {[
              ["Pipeline", "#pipeline"],
              ["Capabilities", "#features"],
              ["Live", "#live"],
              ["Team", "#team"],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="transition-colors hover:text-foreground"
                data-testid={`nav-link-${label.toLowerCase()}`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <MagneticWrap strength={0.2}>
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground px-4 py-2 text-sm font-medium text-background transition-all hover:scale-[1.02] hover:shadow-lg"
              data-testid="nav-cta-launch"
            >
              Launch App
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>
          </MagneticWrap>
        </div>
      </header>

      {/* ──────────── HERO ──────────── */}
      <section className="relative pt-32 pb-24 md:pt-40 md:pb-32" data-testid="hero-section">
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0" style={gridStyle} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 0%, color-mix(in oklch, var(--primary) 12%, transparent), transparent 60%)",
          }}
        />
        <Spotlight />

        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="mx-auto mb-8 flex w-fit items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs backdrop-blur-md">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-primary"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              <span className="text-muted-foreground">Proyek UAS · Pemrograman Data Sains · 2025</span>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="text-center text-5xl font-semibold tracking-tight md:text-7xl lg:text-[5.5rem] lg:leading-[0.95]">
              <span className="block">Analisis Data</span>
              <span className="block">
                <span className="relative inline-block">
                  <span className="bg-gradient-to-br from-foreground via-foreground to-foreground/40 bg-clip-text text-transparent">
                    Tanpa Batas.
                  </span>
                </span>{" "}
                <span className="text-muted-foreground/70">Tanpa Kode.</span>
              </span>
              <span className="block">
                <span className="italic font-serif text-primary">Sepenuhnya</span>{" "}
                <span className="italic font-serif">Otomatis.</span>
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="mx-auto mt-8 max-w-2xl text-center text-base text-muted-foreground md:text-lg">
              AutomationEDA mengotomatiskan seluruh alur eksplorasi data — pembersihan dataset, rekomendasi chart
              berbasis AI, hingga laporan analitis siap ekspor — dalam satu agentic pipeline yang bekerja untuk Anda.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row" data-testid="hero-ctas">
              <MagneticWrap strength={0.3}>
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-all hover:shadow-2xl hover:shadow-primary/20"
                  data-testid="hero-cta-primary"
                >
                  <span className="relative z-10">Mulai Analisis Sekarang</span>
                  <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  <span
                    aria-hidden
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                  />
                </button>
              </MagneticWrap>
              <MagneticWrap strength={0.2}>
                <Link
                  href="#features"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-5 py-3 text-sm font-medium backdrop-blur-md transition-colors hover:bg-card"
                  data-testid="hero-cta-secondary"
                >
                  Lihat Kemampuan
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </MagneticWrap>
            </div>
          </Reveal>

          <Reveal delay={0.45}>
            <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-4">
              {STATS.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.label}
                    className="group flex flex-col items-start gap-2 bg-card/70 p-5 backdrop-blur-md transition-colors hover:bg-card"
                    data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <Icon className="h-4 w-4 text-primary opacity-70" />
                    <div className="font-mono text-3xl font-semibold tracking-tight">
                      {mounted ? <StatNumber target={s.value} suffix={s.suffix} /> : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <div className="mt-24 grid items-center gap-10 lg:grid-cols-2">
            <Reveal delay={0.1}>
              <AICore />
            </Reveal>
            <Reveal delay={0.2}>
              <LiveDashboard />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ──────────── PIPELINE ──────────── */}
      <section id="pipeline" className="relative border-t border-border py-24 md:py-32" data-testid="pipeline-section">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="mb-16 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
                  <Zap className="h-3 w-3 text-primary" /> Cara Kerja
                </div>
                <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
                  Empat langkah. <span className="italic font-serif text-muted-foreground/70">Satu klik.</span>
                </h2>
              </div>
              <p className="max-w-sm text-sm text-muted-foreground">
                Pipeline berjalan secara berurutan namun tampak instan. Setiap tahap dirancang untuk diabaikan oleh
                Anda — fokus pada keputusan, bukan eksekusi.
              </p>
            </div>
          </Reveal>

          <div className="relative">
            <div
              aria-hidden
              className="absolute left-0 right-0 top-1/2 hidden h-px -translate-y-1/2 md:block"
              style={{
                background:
                  "linear-gradient(to right, transparent, color-mix(in oklch, var(--primary) 40%, transparent), transparent)",
              }}
            />

            <div className="relative grid gap-6 md:grid-cols-4">
              {PIPELINE_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <Reveal key={step.step} delay={i * 0.08}>
                    <div
                      className="group relative rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
                      data-testid={`pipeline-step-${step.step}`}
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="font-mono text-xs text-muted-foreground">{step.step}</span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background/80 transition-colors group-hover:border-primary/40 group-hover:bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <h3 className="text-base font-semibold">{step.label}</h3>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        {step.sub}
                      </p>
                      <p className="mt-4 text-sm text-muted-foreground">{step.detail}</p>

                      {i < PIPELINE_STEPS.length - 1 && (
                        <motion.div
                          aria-hidden
                          className="absolute -right-3 top-1/2 hidden h-2 w-2 -translate-y-1/2 rounded-full bg-primary md:block"
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                        />
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>

          <Reveal delay={0.4}>
            <div className="mt-16 flex flex-wrap items-center justify-center gap-2">
              <span className="mr-2 text-xs text-muted-foreground">Built with</span>
              {TECH_STACK.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ──────────── BENTO FEATURES ──────────── */}
      <section id="features" className="relative border-t border-border py-24 md:py-32" data-testid="features-section">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 30%, color-mix(in oklch, var(--primary) 8%, transparent), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="mb-14 max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
                <Layers className="h-3 w-3 text-primary" /> Kapabilitas Platform
              </div>
              <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Enam pipeline yang bekerja{" "}
                <span className="italic font-serif text-muted-foreground/70">secara otomatis.</span>
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Dari upload hingga laporan ekspor — semua berjalan tanpa intervensi manual.
              </p>
            </div>
          </Reveal>

          <div className="grid auto-rows-[180px] gap-4 md:grid-cols-3">
            {BENTO_FEATURES.map((f, i) => {
              const Icon = f.icon;
              const isPrimary = f.accent === "primary";
              return (
                <Reveal key={f.title} delay={i * 0.06} className={f.span}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.3 }}
                    className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border p-6 backdrop-blur-md transition-colors ${
                      isPrimary
                        ? "border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-card/40"
                        : "border-border bg-card/60 hover:border-primary/30"
                    }`}
                    data-testid={`feature-card-${f.tag.split(" ")[0]}`}
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--primary) 15%, transparent), transparent 60%)",
                      }}
                    />

                    <div className="relative flex items-start justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {f.tag}
                      </span>
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                          isPrimary ? "border-primary/40 bg-primary/10" : "border-border bg-background/80"
                        }`}
                      >
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                    </div>

                    <div className="relative">
                      <h3 className="text-lg font-semibold tracking-tight md:text-xl">{f.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>

                      <div className="mt-4 flex items-end gap-2">
                        <span className="font-mono text-2xl font-semibold text-primary">{f.metric}</span>
                        <span className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {f.metricLabel}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────── LIVE / DATA FLOW SECTION ──────────── */}
      <section id="live" className="relative border-t border-border py-24 md:py-32" data-testid="live-section">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
                  <LineChart className="h-3 w-3 text-primary" /> Live Simulation
                </div>
                <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
                  Dari data mentah ke{" "}
                  <span className="italic font-serif text-muted-foreground/70">insight matang.</span>
                </h2>
                <p className="mt-4 max-w-md text-base text-muted-foreground">
                  Pipeline berjalan secara live di sisi browser. Tidak ada server tambahan, tidak ada latensi —
                  hanya data Anda dan pipeline yang bekerja untuk Anda.
                </p>

                <ul className="mt-8 space-y-3 text-sm">
                  {[
                    "Statistik deskriptif numerik & kategorikal otomatis",
                    "Deteksi outlier dengan IQR & z-score",
                    "Korelasi multivariat dengan heatmap interaktif",
                    "Narasi insight otomatis dari Claude AI",
                  ].map((it, i) => (
                    <motion.li
                      key={it}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-2.5"
                    >
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-foreground/85">{it}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <LiveDashboard />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ──────────── CTA BANNER ──────────── */}
      <section className="relative border-t border-border py-24 md:py-32" data-testid="cta-section">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card/60 p-10 backdrop-blur-md md:p-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 80% 80% at 50% 0%, color-mix(in oklch, var(--primary) 18%, transparent), transparent 70%)",
              }}
            />
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50" style={gridStyle} />

            <div className="relative text-center">
              <Reveal>
                <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
                  Siap menganalisis{" "}
                  <span className="italic font-serif text-primary">dataset Anda?</span>
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
                  Upload dataset dan dapatkan insight mendalam lengkap dengan visualisasi interaktif dan laporan
                  ekspor — dalam hitungan detik.
                </p>
              </Reveal>
              <Reveal delay={0.2}>
                <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <MagneticWrap strength={0.3}>
                    <button
                      type="button"
                      onClick={() => setLoginOpen(true)}
                      className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background shadow-lg transition-all hover:shadow-2xl hover:shadow-primary/30"
                      data-testid="cta-banner-primary"
                    >
                      <UploadCloud className="h-4 w-4" />
                      Buka Upload Data
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      <span
                        aria-hidden
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                      />
                    </button>
                  </MagneticWrap>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── TEAM ──────────── */}
      <section id="team" className="relative border-t border-border py-24 md:py-32" data-testid="team-section">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="mb-14 max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
                <Sparkle className="h-3 w-3 text-primary" /> Dikerjakan oleh
              </div>
              <h2 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Tim Pengembang
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Tujuh mahasiswa yang berkolaborasi membangun AutomationEDA sebagai proyek akhir semester
                mata kuliah Pemrograman Data Sains.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {TEAM_MEMBERS.map((m, i) => (
              <Reveal key={m.id} delay={i * 0.04}>
                <motion.div
                  whileHover={{ y: -3 }}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-md transition-colors hover:border-primary/40"
                  data-testid={`team-card-${m.initials.toLowerCase()}`}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--primary) 12%, transparent), transparent 60%)",
                    }}
                  />
                  <div className="relative flex items-center gap-3">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-background/80 font-mono text-sm font-semibold">
                      {m.initials}
                      <motion.div
                        aria-hidden
                        className="absolute inset-0 rounded-full"
                        style={{
                          background:
                            "conic-gradient(from 0deg, color-mix(in oklch, var(--primary) 50%, transparent), transparent 40%, transparent 60%, color-mix(in oklch, var(--primary) 50%, transparent))",
                          padding: "1px",
                          opacity: 0.5,
                          maskImage: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
                          WebkitMaskImage:
                            "linear-gradient(black, black) content-box, linear-gradient(black, black)",
                          maskComposite: "exclude",
                          WebkitMaskComposite: "xor",
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{m.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{m.role}</div>
                    </div>
                  </div>
                  <div className="relative mt-4 flex items-center gap-2">
                    <Link
                      href={m.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      aria-label={`LinkedIn ${m.name}`}
                      data-testid={`team-linkedin-${m.initials.toLowerCase()}`}
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href={m.github}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/60 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      aria-label={`GitHub ${m.name}`}
                      data-testid={`team-github-${m.initials.toLowerCase()}`}
                    >
                      <Github className="h-3.5 w-3.5" />
                    </Link>
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">{m.nim}</span>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── FOOTER ──────────── */}
      <footer className="relative border-t border-border bg-card/30 py-10" data-testid="landing-footer">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-semibold">AutomationEDA</span>
            <span className="text-muted-foreground">© 2025</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link href="#pipeline" className="transition-colors hover:text-foreground">
              Pipeline
            </Link>
            <Link href="#features" className="transition-colors hover:text-foreground">
              Features
            </Link>
            <Link href="#team" className="transition-colors hover:text-foreground">
              Team
            </Link>
            <Link
              href="https://github.com/YanDraa/automationeda" target="_blank" rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </Link>
          </div>
        </div>
      </footer>

      {/* ──────────── LOGIN DIALOG ──────────── */}
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
