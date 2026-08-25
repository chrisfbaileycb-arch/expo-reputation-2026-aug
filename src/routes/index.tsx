import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Star,
  MessageSquareHeart,
  Wand2,
  Send,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Check,
  Search,
  FileSignature,
  HeartHandshake,
  LineChart,
  FileText,
  Clock,
  CircleDot,
  CheckCircle2,
  XCircle,
  Building2,
  Zap,
  AlertTriangle,
  RefreshCw,
  Sliders,
  DollarSign,
  Award,
  Lock,
  Smartphone,
  Mail,
  Layers,
  Bot,
  UserCheck,
  ChevronRight,
  Filter,
  ShieldAlert,
  PhoneCall,
  CheckCheck,
  Flame,
  HelpCircle,
  Info,
  ExternalLink,
  Users,
  MapPin,
  Share2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Expo Proxy AI — Closed-Loop Reputation & Google Policy Scan for SMBs" },
      {
        name: "description",
        content:
          "The only reputation platform built specifically for local SMBs. Intercept negative feedback privately with our Make-It-Right engine and scan Google Business Profile for policy-violating slander.",
      },
      {
        property: "og:title",
        content: "Expo Proxy AI — Closed-Loop Reputation & Google Policy Scan for SMBs",
      },
      {
        property: "og:description",
        content:
          "Enterprise power at a local business price. Closed-loop negative review intercept, Google Business Profile policy compliance scanning, and 90% automated workflows.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [auditQuery, setAuditQuery] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<null | {
    name: string;
    rating: number;
    totalReviews: number;
    flaggedReviews: number;
    potentialLift: number;
    savedRevenue: number;
  }>(null);

  const handleRunAudit = (e?: React.FormEvent, customName?: string) => {
    if (e) e.preventDefault();
    const query = customName || auditQuery.trim() || "Joe's Auto & Service Center";
    setIsAuditing(true);
    setAuditResult(null);

    setTimeout(() => {
      setIsAuditing(false);
      setAuditResult({
        name: query,
        rating: 3.8,
        totalReviews: 142,
        flaggedReviews: 4,
        potentialLift: 0.5,
        savedRevenue: 3200,
      });
    }, 900);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      <Header
        onOpenAudit={() => {
          const el = document.getElementById("hero-audit");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
      />
      <Hero
        auditQuery={auditQuery}
        setAuditQuery={setAuditQuery}
        isAuditing={isAuditing}
        auditResult={auditResult}
        onRunAudit={handleRunAudit}
      />
      <TrustBar />
      <CapabilityMatrix />
      <MakeItRightDeepDive />
      <CommunityPRSection />
      <OperationalSLA />
      <PricingAndROI />
      <BeforeAfter />
      <RecoveryTracker />
      <Terms />
      <Guarantee />
      <FAQ />
      <CTA onRunAudit={handleRunAudit} />
      <Footer />
    </div>
  );
}

/* =========================================================================
   HEADER COMPONENT
   ========================================================================= */
function Header({ onOpenAudit }: { onOpenAudit: () => void }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Star className="h-5 w-5 fill-current text-accent" />
          </div>
          <div>
            <div className="font-display text-lg font-bold tracking-tight text-foreground flex items-center gap-1.5">
              Expo Proxy{" "}
              <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-sans font-semibold uppercase text-accent-foreground">
                AI
              </span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Reputation Engine for Independent SMBs
            </div>
          </div>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
          <a href="#hero-audit" className="text-muted-foreground transition hover:text-foreground">
            Instant Audit
          </a>
          <a href="#matrix" className="text-muted-foreground transition hover:text-foreground">
            VS Enterprise
          </a>
          <a
            href="#recovery-engine"
            className="text-muted-foreground transition hover:text-foreground"
          >
            Recovery Engine
          </a>
          <a href="#community" className="text-muted-foreground transition hover:text-foreground">
            Community & PR
          </a>
          <a href="#sla" className="text-muted-foreground transition hover:text-foreground">
            90% SLA
          </a>
          <a href="#pricing" className="text-muted-foreground transition hover:text-foreground">
            Pricing
          </a>
          <a href="#calculator" className="text-muted-foreground transition hover:text-foreground">
            ROI Calculator
          </a>
          <a href="#faq" className="text-muted-foreground transition hover:text-foreground">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAudit}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10"
          >
            <Search className="h-3.5 w-3.5" /> Scan My Business
          </button>
          <a
            href="/auth"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90"
          >
            Start Free Scan <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

/* =========================================================================
   SECTION 1: HERO SECTION (High Trust + Instant Audit Above the Fold)
   ========================================================================= */
function Hero({
  auditQuery,
  setAuditQuery,
  isAuditing,
  auditResult,
  onRunAudit,
}: {
  auditQuery: string;
  setAuditQuery: (v: string) => void;
  isAuditing: boolean;
  auditResult: {
    businessName?: string;
    rating?: number;
    reviewCount?: number;
    flaggedReviews?: number;
    potentialLift?: number;
    savedRevenue?: number;
  } | null;
  onRunAudit: (e?: React.FormEvent, customName?: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"intercept" | "policy" | "routing" | "community">(
    "intercept",
  );

  const sampleBusinesses = [
    "Joe's Auto Repair",
    "Rosewood Hair Salon",
    "Main Street Diner",
    "Oakridge Dental Care",
  ];

  return (
    <section className="relative overflow-hidden px-4 pt-12 pb-20 sm:px-6 md:pt-20 md:pb-28">
      {/* Background radial glows */}
      <div className="pointer-events-none absolute -top-24 right-0 h-[500px] w-[500px] rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -left-32 h-[450px] w-[450px] rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column: Value Prop & Instant Audit Widget */}
          <div className="lg:col-span-7 text-left">
            {/* Kicker Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              Built Specifically for Independent Local Businesses & Service Shops
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Stop Bad Reviews{" "}
              <span className="underline decoration-accent decoration-wavy decoration-2">
                Before
              </span>{" "}
              They Hit Google.
              <br />
              <span className="italic text-primary">Elevate Your Rating Automatically.</span>
            </h1>

            {/* Subheadline */}
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
              Generic tools charge $400/mo to broadcast 1-star reviews publicly.{" "}
              <strong className="font-semibold text-foreground">Expo Proxy AI</strong> intercepts
              unhappy customers privately into a manager recovery queue, while scanning your Google
              Business Profile for policy-violating slander.
            </p>

            {/* Instant Audit Capture Widget */}
            <div
              id="hero-audit"
              className="mt-8 max-w-xl rounded-2xl border border-border bg-card p-4 shadow-xl shadow-primary/5"
            >
              <label className="block text-xs font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5" /> Instant Google Business Profile Scan
              </label>
              <form onSubmit={onRunAudit} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={auditQuery}
                    onChange={(e) => setAuditQuery(e.target.value)}
                    placeholder="Enter your Google Business Name or City..."
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAuditing}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90 disabled:opacity-50"
                >
                  {isAuditing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Scanning...
                    </>
                  ) : (
                    <>
                      Scan Listing <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Sample Shortcuts */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">Try sample:</span>
                {sampleBusinesses.map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      setAuditQuery(b);
                      onRunAudit(undefined, b);
                    }}
                    className="rounded-md border border-border/80 bg-secondary/50 px-2 py-0.5 text-[11px] hover:border-primary hover:bg-secondary transition"
                  >
                    {b}
                  </button>
                ))}
              </div>

              {/* Audit Result Box */}
              {auditResult && (
                <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" /> {auditResult.name}
                    </div>
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                      Scan Complete
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <div className="rounded-lg bg-card p-2 border border-border">
                      <div className="text-muted-foreground">Current Rating</div>
                      <div className="font-bold text-foreground text-base">
                        {auditResult.rating}★
                      </div>
                    </div>
                    <div className="rounded-lg bg-card p-2 border border-border">
                      <div className="text-muted-foreground">Policy Violations</div>
                      <div className="font-bold text-destructive text-base">
                        {auditResult.flaggedReviews} reviews
                      </div>
                    </div>
                    <div className="rounded-lg bg-card p-2 border border-border">
                      <div className="text-muted-foreground">Estimated Lift</div>
                      <div className="font-bold text-primary text-base">
                        +{auditResult.potentialLift}★
                      </div>
                    </div>
                    <div className="rounded-lg bg-card p-2 border border-border">
                      <div className="text-muted-foreground">Protected Rev.</div>
                      <div className="font-bold text-accent-foreground text-base">
                        ${auditResult.savedRevenue}/mo
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Found 4 policy-violating reviews eligible for Google removal evidence.
                    </p>
                    <a
                      href="/auth"
                      className="inline-flex items-center gap-1 font-semibold text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                    >
                      Claim Evidence Packet →
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Proof Badges */}
            <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" /> No long sales demos required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" /> 0.3-Star Rating Lift Guarantee
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Works with Square, Toast, Clover &
                CSVs
              </span>
            </div>
          </div>

          {/* Right Column: High-Fidelity UI Mockup Card */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="rounded-3xl border border-border bg-card p-3 shadow-2xl shadow-primary/10">
                {/* Header Control */}
                <div className="rounded-2xl bg-secondary/50 p-4 border border-border/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                      <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
                      <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
                      <span className="ml-2 text-xs font-semibold text-foreground">
                        Expo Proxy Control Center
                      </span>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Live Workflow
                    </span>
                  </div>

                  {/* Interactive Tab Selector inside Mockup */}
                  <div className="mt-4 flex rounded-xl bg-background p-1 text-[11px] font-medium border border-border">
                    <button
                      onClick={() => setActiveTab("intercept")}
                      className={`flex-1 rounded-lg py-1.5 text-center transition ${
                        activeTab === "intercept"
                          ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      1. Intercept
                    </button>
                    <button
                      onClick={() => setActiveTab("policy")}
                      className={`flex-1 rounded-lg py-1.5 text-center transition ${
                        activeTab === "policy"
                          ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      2. Policy Scan
                    </button>
                    <button
                      onClick={() => setActiveTab("routing")}
                      className={`flex-1 rounded-lg py-1.5 text-center transition ${
                        activeTab === "routing"
                          ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      3. 5★ Route
                    </button>
                    <button
                      onClick={() => setActiveTab("community")}
                      className={`flex-1 rounded-lg py-1.5 text-center transition ${
                        activeTab === "community"
                          ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      4. Cause PR
                    </button>
                  </div>

                  {/* Tab 1: Closed-Loop Intercept Mockup */}
                  {activeTab === "intercept" && (
                    <div className="mt-4 space-y-3 animate-in fade-in duration-200">
                      <div className="rounded-xl border border-accent/30 bg-accent/10 p-3.5 text-xs text-foreground">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1.5 text-accent-foreground">
                            <ShieldAlert className="h-4 w-4 text-accent" /> 2-Star Feedback
                            Intercepted
                          </span>
                          <span className="text-[10px] text-muted-foreground">2 mins ago</span>
                        </div>
                        <p className="mt-2 text-muted-foreground leading-relaxed">
                          &quot;Food was cold and service took 35 mins. Very disappointed.&quot;
                        </p>
                        <div className="mt-3 flex items-center justify-between border-t border-accent/20 pt-2 text-[11px]">
                          <span className="font-semibold text-primary">
                            Action: Routed Privately to Owner Queue
                          </span>
                          <span className="rounded bg-accent px-1.5 py-0.5 font-bold text-accent-foreground text-[10px]">
                            Not Posted to Google
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-3 text-xs">
                        <div className="flex items-center justify-between font-semibold text-foreground">
                          <span className="flex items-center gap-1.5">
                            <Bot className="h-4 w-4 text-primary" /> AI Drafted Remediation Voucher
                          </span>
                          <span className="text-primary font-bold">1-Tap Send</span>
                        </div>
                        <p className="mt-1 text-muted-foreground text-[11px] leading-relaxed">
                          &quot;Hi Dave, Sam from Main St Diner here. So sorry about your visit!
                          Here is a $15 voucher on us for your next meal.&quot;
                        </p>
                      </div>

                      <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-foreground">
                            Outcome: Customer Converted
                          </span>
                        </div>
                        <span className="font-bold text-primary">+3 Stars Recovered</span>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Policy Compliance Scan Mockup */}
                  {activeTab === "policy" && (
                    <div className="mt-4 space-y-3 animate-in fade-in duration-200">
                      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-foreground">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1.5 text-destructive">
                            <AlertTriangle className="h-4 w-4" /> Policy Violation Detected
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Google GBP Review
                          </span>
                        </div>
                        <p className="mt-2 text-muted-foreground leading-relaxed">
                          &quot;This place stinks! Go to Pizza Palace across the street
                          instead!&quot;
                        </p>
                        <div className="mt-3 flex items-center justify-between border-t border-destructive/20 pt-2 text-[11px]">
                          <span className="font-semibold text-foreground">
                            Violation: Conflict of Interest &amp; Spam
                          </span>
                          <span className="rounded bg-destructive text-destructive-foreground px-1.5 py-0.5 font-bold text-[10px]">
                            High Removal Probability
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-3 text-xs">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <FileText className="h-4 w-4 text-primary" /> Generated Evidence Packet
                        </div>
                        <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground">
                          <li>• Citations: Google Maps UGC Policy Sec 3.2</li>
                          <li>• Competitor promotional link detected</li>
                          <li>• Pre-formatted for Google Legal Portal submission</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: 5-Star Routing */}
                  {activeTab === "routing" && (
                    <div className="mt-4 space-y-3 animate-in fade-in duration-200">
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-xs text-foreground">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1.5 text-primary">
                            <Sparkles className="h-4 w-4" /> 5-Star SMS Request Sent
                          </span>
                          <span className="text-[10px] text-muted-foreground">Auto-Triggered</span>
                        </div>
                        <p className="mt-2 text-muted-foreground leading-relaxed">
                          &quot;Thanks for visiting Rosewood Salon today! Would you mind sharing
                          your 5-star experience on Google?&quot;
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-3 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 fill-accent text-accent" />
                          <span className="font-semibold text-foreground">
                            Google Business Profile Updated
                          </span>
                        </div>
                        <span className="font-bold text-foreground">5.0★ Verified</span>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Local Community PR & Cause Recommendation */}
                  {activeTab === "community" && (
                    <div className="mt-4 space-y-3 animate-in fade-in duration-200">
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-foreground">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                            <HeartHandshake className="h-4 w-4 text-emerald-600" /> Community Cause
                            Recommended
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Central Texas Food Bank
                          </span>
                        </div>
                        <div className="mt-2.5 flex items-center gap-2.5 bg-background/80 rounded-lg p-2 border border-border">
                          <img
                            src="https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=200"
                            alt="Volunteers sorting fresh food"
                            className="h-10 w-10 rounded object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1 text-[11px]">
                            <div className="font-bold text-foreground truncate">
                              Central Texas Food Bank
                            </div>
                            <div className="text-muted-foreground">
                              $250 provides 1,000 warm meals
                            </div>
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                          AI Post Copy Ready: &quot;We are proud to support Central Texas Food Bank!
                          Every meal at our diner helps feed local families...&quot;
                        </p>
                        <div className="mt-3 flex items-center justify-between border-t border-emerald-500/20 pt-2 text-[10px]">
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            1-Click Copy Post &amp; Photo
                          </span>
                          <span className="text-muted-foreground italic">No Auto-Posting</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   TRUST BRAND BAR
   ========================================================================= */
function TrustBar() {
  return (
    <section className="border-y border-border/70 bg-secondary/30 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
        <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
          Trusted by over 1,200 independent local business operators across North America
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-foreground/80">
          <span className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-primary" /> Auto Repair &amp; Service Shops
          </span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-primary" /> Local Restaurants &amp; Cafes
          </span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-primary" /> Senior Care &amp; Clinics
          </span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-primary" /> Dental &amp; Health Practices
          </span>
          <span className="text-border">•</span>
          <span className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-primary" /> Salons &amp; Spas
          </span>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   SECTION 2: TRUST & CAPABILITY MATRIX (The "Anti-Birdeye" Reality Check)
   ========================================================================= */
function CapabilityMatrix() {
  const comparisons = [
    {
      feature: "Target Audience & Focus",
      birdeye: "High-end corporate enterprise chains ($300-$500/mo per location)",
      expo: "Independent local SMBs, service shops, & multi-location operators",
      highlight: true,
    },
    {
      feature: "Negative Feedback Handling",
      birdeye: "Broadcasts 1-star reviews publicly to Google; leaves owner to scramble",
      expo: "Closed-Loop Intercept: 1-3 star feedback routed privately to manager recovery queue",
      highlight: true,
    },
    {
      feature: "Google GBP Policy Scanning",
      birdeye: "Manual generic flag button with zero policy citation evidence",
      expo: "Automated scan for off-topic, competitor spam, & slander with evidence packets",
      highlight: true,
    },
    {
      feature: "Make-It-Right Amend Nudges",
      birdeye: "None. Hopes unhappy customers manually go back to edit reviews",
      expo: "Automated gentle 1-tap amend SMS nudge with pre-loaded review link",
      highlight: true,
    },
    {
      feature: "Daily Operational Time",
      birdeye: "30+ mins/day navigating complex multi-tab enterprise dashboards",
      expo: "Under 2 mins/day with AI-drafted replies requiring 1-click human approval",
      highlight: false,
    },
    {
      feature: "Native Integrations",
      birdeye: "Bloated custom CRM connectors requiring IT developer setup",
      expo: "Google Business OAuth + Auto-Reply, Yelp SerpApi, Facebook, SMS & Email",
      highlight: false,
    },
    {
      feature: "Pricing & Contract Terms",
      birdeye: "$399–$599/mo locked annual contracts with auto-renewal traps",
      expo: "$79–$129/mo transparent pricing, 14-day refund, plain English terms",
      highlight: true,
    },
    {
      feature: "Rating Guarantee",
      birdeye: "Zero star rating guarantee; no refund if ratings stagnate",
      expo: "0.3-Star Rating Lift Promise in 90 days or we work free until reached",
      highlight: true,
    },
  ];

  return (
    <section id="matrix" className="px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Enterprise Power at a Local Business Price
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl md:text-5xl">
            The &quot;Anti-Birdeye&quot; Reality Check
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Birdeye and Podium were built for corporate marketing directors with $100k budgets.{" "}
            <strong className="text-foreground">Expo Proxy AI</strong> was engineered for busy local
            business operators who need rating protection without the enterprise bloat.
          </p>
        </div>

        {/* 3-Column Matrix Table */}
        <div className="mt-12 overflow-x-auto rounded-3xl border border-border bg-card shadow-xl">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-secondary/50 text-xs uppercase tracking-wider font-bold">
                <th className="p-5 text-foreground w-1/4">Operational Capability</th>
                <th className="p-5 text-muted-foreground w-1/3 border-l border-border">
                  Generic Enterprise Aggregators
                  <br />
                  <span className="text-[10px] font-normal text-muted-foreground/80">
                    (Birdeye, Podium, etc.)
                  </span>
                </th>
                <th className="p-5 text-primary bg-primary/10 w-5/12 border-l border-border">
                  Expo Proxy AI
                  <br />
                  <span className="text-[10px] font-normal text-primary/80">
                    (Built for Independent SMBs)
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-sm">
              {comparisons.map((c, i) => (
                <tr key={c.feature} className={i % 2 === 0 ? "bg-card" : "bg-background/40"}>
                  <td className="p-5 font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    {c.feature}
                  </td>
                  <td className="p-5 text-muted-foreground border-l border-border/60 text-xs sm:text-sm">
                    <div className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <span>{c.birdeye}</span>
                    </div>
                  </td>
                  <td className="p-5 border-l border-border/60 bg-primary/5 text-foreground font-medium text-xs sm:text-sm">
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{c.expo}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Integration Capabilities Row */}
        <div className="mt-12 rounded-2xl border border-border bg-secondary/30 p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
            Native Deep Integrations Included in Every Plan
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="font-bold text-foreground text-sm flex items-center justify-center gap-1">
                <Star className="h-4 w-4 fill-accent text-accent" /> Google GBP
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">OAuth + Live Reply</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="font-bold text-foreground text-sm flex items-center justify-center gap-1">
                <Search className="h-4 w-4 text-primary" /> Yelp
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">SerpApi Sync</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="font-bold text-foreground text-sm flex items-center justify-center gap-1">
                <Users className="h-4 w-4 text-primary" /> Facebook
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Page Reviews</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="font-bold text-foreground text-sm flex items-center justify-center gap-1">
                <Smartphone className="h-4 w-4 text-primary" /> SMS Outreach
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Twilio High-Deliverability
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="font-bold text-foreground text-sm flex items-center justify-center gap-1">
                <Mail className="h-4 w-4 text-primary" /> Email Campaigns
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Automated Requests</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="font-bold text-foreground text-sm flex items-center justify-center gap-1">
                <Zap className="h-4 w-4 text-primary" /> POS Connectors
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Square, Toast, Clover</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   SECTION 3: THE CLOSED-LOOP "MAKE-IT-RIGHT" RECOVERY ENGINE
   ========================================================================= */
function MakeItRightDeepDive() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: "01",
      title: "Service Completion & Automated Trigger",
      subtitle: "Customer completes dinner, haircut, oil change, or dental visit.",
      desc: "Our engine automatically hooks into your POS (Square, Toast, Clover) or simple daily contact upload to initiate a polite review request within 5 minutes of service completion.",
      badge: "Sub-5 Min Timing",
      icon: Clock,
      mockupData: {
        header: "Automated SMS Request Sent",
        content:
          "Hi Sarah! Thanks for dining at Main St Diner today. How was your meal? Tap to rate:",
        stars: "★★★★★ (4-5★)  |  ★★★☆☆ (1-3★)",
      },
    },
    {
      num: "02",
      title: "Smart Sentiment & Star Filter",
      subtitle: "4-5 star reviews fast-tracked to Google; 1-3 star feedback held privately.",
      desc: "Happy customers are directed straight to your Google Business Profile or Yelp listing in one tap. Unhappy customers are routed into a private owner portal—preventing public damage.",
      badge: "100% Closed Loop",
      icon: Filter,
      mockupData: {
        header: "Smart Traffic Routing",
        content:
          "4-5 Stars → Fast-Tracked to Google Business Profile\n1-3 Stars → Intercepted to Private Manager 'Make-It-Right' Queue",
        stars: "Public Damage Prevented",
      },
    },
    {
      num: "03",
      title: "Private Manager Recovery Queue",
      subtitle: "AI drafts personalized apology & remediation offer for manager approval.",
      desc: "When negative feedback is intercepted, your manager receives an instant SMS alert with an AI-drafted response and optional remediation voucher (e.g. 20% off next visit or free appetizer).",
      badge: "< 2 Min Response",
      icon: ShieldAlert,
      mockupData: {
        header: "Manager Recovery Alert",
        content:
          "Customer Dave reported slow service. AI Drafted Offer: '$10 credit on next visit'. Tap 'Approve & Send' to deliver to customer privately.",
        stars: "Private Resolution",
      },
    },
    {
      num: "04",
      title: "Gentle Amend Nudge",
      subtitle: "Once issue is made right, customer receives 1-tap review update link.",
      desc: "After the customer accepts the remediation, Expo Proxy AI sends a polite, non-pushy follow-up asking them to update their initial impression on Google with context pre-loaded.",
      badge: "38% Amend Conversion",
      icon: RefreshCw,
      mockupData: {
        header: "1-Tap Amend SMS Sent",
        content:
          "Hi Dave — Sam here. Glad we could fix your meal today! If you have a moment, here is a 1-tap link to update your review on Google: [Update Review →]",
        stars: "2★ → 5★ Recovered",
      },
    },
    {
      num: "05",
      title: "Google Business Policy Violation Scanning",
      subtitle: "Automatic detection & evidence packet generation for fake or slanderous reviews.",
      desc: "For reviews that hit Google directly, our AI checks against Google's official UGC policy terms (off-topic, spam, competitor conflict of interest, hate speech). Generates legal evidence packets for removal.",
      badge: "Policy Protection",
      icon: FileSignature,
      mockupData: {
        header: "Google Policy Removal Packet",
        content:
          "Flagged Review: 'Don't go here, go to competitor X'. Violation: Section 3.2 Conflict of Interest. Evidence packet submitted to Google Legal Portal.",
        stars: "Removal Evidence Ready",
      },
    },
  ];

  return (
    <section
      id="recovery-engine"
      className="relative overflow-hidden bg-primary px-4 py-20 text-primary-foreground sm:px-6 md:py-28"
    >
      {/* Background glow marks */}
      <div className="pointer-events-none absolute -right-20 top-10 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-10 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">
            Product Deep Dive
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl md:text-5xl">
            The Closed-Loop &quot;Make-It-Right&quot; Recovery Engine
          </h2>
          <p className="mt-4 text-base text-primary-foreground/85 sm:text-lg">
            Standard review platforms leave you helpless when a 1-star review hits Google. Here is
            the exact 5-step closed-loop workflow that intercepts bad experiences and turns them
            into 5-star rating lifts.
          </p>
        </div>

        {/* Step Selector & Visualizer */}
        <div className="mt-14 grid gap-8 lg:grid-cols-12 lg:items-center">
          {/* Steps Navigation List */}
          <div className="lg:col-span-6 space-y-3">
            {steps.map((st, idx) => {
              const Icon = st.icon;
              const isActive = activeStep === idx;
              return (
                <div
                  key={st.num}
                  onClick={() => setActiveStep(idx)}
                  className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                    isActive
                      ? "border-accent bg-primary-foreground/10 shadow-lg scale-[1.01]"
                      : "border-primary-foreground/15 bg-primary/40 hover:bg-primary-foreground/5"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display font-bold text-sm ${
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "bg-primary-foreground/20 text-primary-foreground"
                      }`}
                    >
                      {st.num}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-bold text-base text-primary-foreground flex items-center gap-2">
                          {st.title}
                        </h3>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "bg-primary-foreground/20 text-primary-foreground/80"
                          }`}
                        >
                          {st.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-primary-foreground/80 font-medium">
                        {st.subtitle}
                      </p>
                      {isActive && (
                        <p className="mt-2 text-xs text-primary-foreground/90 leading-relaxed border-t border-primary-foreground/15 pt-2 animate-in fade-in duration-200">
                          {st.desc}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Visual Interactive Mockup Card */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-primary-foreground/20 bg-background text-foreground p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-accent" />
                  <span className="font-display font-bold text-sm text-foreground">
                    Step {steps[activeStep].num} Live UI Preview
                  </span>
                </div>
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {steps[activeStep].badge}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {steps[activeStep].mockupData.header}
                  </div>
                  <div className="mt-3 rounded-xl bg-secondary/60 p-4 text-sm font-sans whitespace-pre-line leading-relaxed text-foreground">
                    {steps[activeStep].mockupData.content}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                    <span className="font-semibold text-primary">Status: Active Engine Loop</span>
                    <span className="font-bold text-accent-foreground">
                      {steps[activeStep].mockupData.stars}
                    </span>
                  </div>
                </div>

                {/* Key Metrics Pill Row */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-border bg-card p-3">
                    <div className="font-display font-bold text-lg text-primary">+0.4★</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Avg Rating Lift
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <div className="font-display font-bold text-lg text-accent-foreground">38%</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Amend Rate
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3">
                    <div className="font-display font-bold text-lg text-foreground">&lt; 5 Min</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Response Speed
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   LOCAL COMMUNITY IMPACT & PR REPUTATION ENGINE
   ========================================================================= */
function CommunityPRSection() {
  return (
    <section
      id="community"
      className="px-4 py-20 bg-secondary/30 border-y border-border/70 sm:px-6 md:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <HeartHandshake className="h-3.5 w-3.5 text-emerald-600" />
            New Reputation Growth Tool
          </div>
          <h2 className="font-display text-3xl font-bold sm:text-4xl md:text-5xl text-foreground">
            Local Community Impact &amp; Philanthropy PR
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg leading-relaxed">
            Strengthen your reputation from the inside out. Expo Proxy AI analyzes your local
            neighborhood for verified 501(c)(3) charities and provides pre-formatted,
            reputation-boosting social updates—with zero auto-posting.
          </p>
        </div>

        {/* 3 Core Pillars */}
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-xl text-foreground">
                1. Local Community Scanner
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Scan verified non-profits, youth sports leagues, and food banks near your city or
                zip code. Includes real charity photos, impact metrics, and official donation links.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/50 p-3 text-xs text-muted-foreground font-medium">
              <span className="font-bold text-foreground">Authentic Media:</span> Uses real partner
              images, never generic AI placeholders.
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 font-bold">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-xl text-foreground">
                2. Goodwill Reputation Buffer
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When customers know your business gives back to their neighborhood, they are 3x more
                likely to leave positive 5-star Google reviews and forgive minor service hiccups.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/50 p-3 text-xs text-muted-foreground font-medium">
              <span className="font-bold text-foreground">E-E-A-T Signal:</span> Local backlinks
              &amp; civic posts boost Google Maps Local SEO.
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent-foreground font-bold">
                <Share2 className="h-6 w-6" />
              </div>
              <h3 className="font-display font-bold text-xl text-foreground">
                3. Pre-Formatted PR Content
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Get monthly AI-crafted social captions tailored for Google Updates, Facebook,
                Instagram, LinkedIn, and Nextdoor. 1-click copy or share whenever you choose.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-950 dark:text-amber-200 font-medium">
              <span className="font-bold">Zero Auto-Posting:</span> You retain 100% control over
              your social channels.
            </div>
          </div>
        </div>

        {/* Call to Action Box inside Section */}
        <div className="mt-12 rounded-3xl border border-primary/30 bg-card p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
          <div className="space-y-1 text-left">
            <h4 className="font-display font-bold text-lg sm:text-xl text-foreground">
              Ready to explore local causes near your business?
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Try our free local community scanner inside the dashboard. Discover charities in under
              30 seconds.
            </p>
          </div>
          <a
            href="/dashboard/community"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90"
          >
            Launch Community Scanner <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   SECTION 4: OPERATIONAL REALITIES & TRANSPARENCY SLA (The Trust Builder)
   ========================================================================= */
function OperationalSLA() {
  const slaPoints = [
    {
      title: "The 90-95% Automation SLA",
      highlight: "Under 2 Minutes Per Day",
      icon: Bot,
      body: "We handle 90-95% of the heavy lifting automatically: review monitoring, policy violation scanning, sentiment analysis, and initial draft creation. All you do is review and click 'Approve'.",
    },
    {
      title: "Human-in-the-Loop Safeguard",
      highlight: "Zero Unapproved Auto-Posts",
      icon: UserCheck,
      body: "We NEVER auto-post replies to your Google Business Profile without explicit human sign-off. Your brand tone and reputation remain 100% under your final decision authority.",
    },
    {
      title: "POS & System Agnostic",
      highlight: "No Complex IT Setup",
      icon: Layers,
      body: "Whether you use Square, Toast, Clover, LightSpeed, or simple end-of-day customer CSVs, Expo Proxy AI integrates smoothly without requiring custom software development.",
    },
    {
      title: "Plain-English Contract Guarantee",
      highlight: "No Auto-Renewal Traps",
      icon: Lock,
      body: "Simple 12-month term with a clear 50% early termination clause, a 14-day no-questions-asked refund window, and our 0.3-Star Rating Lift Guarantee.",
    },
  ];

  return (
    <section id="sla" className="px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            No Black-Box Secrets
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl md:text-5xl">
            Our Operational Realities &amp; 90% Automation SLA
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            We believe local business owners deserve complete operational transparency. Here is
            plain-English clarity on how our platform operates alongside your daily routine.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {slaPoints.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="relative rounded-3xl border border-border bg-card p-8 shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-bold text-accent-foreground">
                    {item.highlight}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-xl font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            );
          })}
        </div>

        {/* Operational Commitment Box */}
        <div className="mt-10 rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div>
              <h4 className="font-display font-bold text-lg text-foreground">
                Have specific POS or multi-unit questions?
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Our support team responds to local business owners in under 15 minutes during
                business hours.
              </p>
            </div>
            <a
              href="mailto:hello@expoproxy.com"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              <Mail className="h-4 w-4" /> Ask Our Engineers
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   SECTION 5: HIGH-CONVERTING PRICING & ROI SECTION
   ========================================================================= */
function PricingAndROI() {
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");

  // ROI Calculator State
  const [avgSpend, setAvgSpend] = useState<number>(85);
  const [monthlyCustomers, setMonthlyCustomers] = useState<number>(300);
  const [currentStars, setCurrentStars] = useState<number>(3.8);

  const calcResults = useMemo(() => {
    // Estimations based on conversion CRO standards:
    // ~3% of customers experience an issue or leave a review
    // Closed loop intercepts ~60% of bad ratings before public post
    const estimatedBadReviews = Math.round(monthlyCustomers * 0.025);
    const interceptedReviews = Math.round(estimatedBadReviews * 0.7);
    const savedCustomerChurnValue = interceptedReviews * avgSpend * 12;
    const projectedRatingLift = currentStars < 4.0 ? 0.5 : 0.3;
    const annualSoftwareCost = billingCycle === "annual" ? 109 * 12 : 129 * 12;
    const roiMultiple = Math.max(1, Math.round(savedCustomerChurnValue / annualSoftwareCost));

    return {
      interceptedReviews,
      savedCustomerChurnValue,
      projectedRatingLift,
      roiMultiple,
    };
  }, [avgSpend, monthlyCustomers, currentStars, billingCycle]);

  const tiers = [
    {
      name: "Starter",
      tagline: "Solo operator, 1 location, single platform focus",
      annualPrice: 69,
      monthlyPrice: 89,
      featured: false,
      features: [
        "Up to 1 location",
        "1 review platform (Google GBP)",
        "AI-drafted replies with human approval",
        "150 SMS review requests / month",
        "Basic Google policy violation scan",
        "Email support",
      ],
    },
    {
      name: "Growth",
      tagline: "Local SMBs ready to grow — Most Popular",
      annualPrice: 109,
      monthlyPrice: 129,
      featured: true,
      features: [
        "Up to 3 locations",
        "All platforms (Google, Yelp, Facebook)",
        "Closed-Loop 'Make-It-Right' Engine",
        "1,000 SMS + unlimited email requests / mo",
        "Automated Google removal evidence packets",
        "Branded public reputation scorecard",
        "Priority support",
      ],
    },
    {
      name: "Multi-Location Pro",
      tagline: "Agencies, senior care, & multi-unit operators",
      annualPrice: 219,
      monthlyPrice: 249,
      featured: false,
      features: [
        "Up to 10 locations",
        "Everything in Growth tier",
        "Role-based access (owner, manager, responder)",
        "White-label scorecard on custom domain",
        "Dedicated onboarding specialist",
        "Quarterly reputation performance audit",
      ],
    },
  ];

  return (
    <section id="pricing" className="bg-secondary/20 px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Transparent SMB Pricing
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl md:text-5xl">
            Enterprise Results at Local Business Prices
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            No mandatory $1,500 onboarding fees. No $400/month recurring drain. Choose the plan
            built for your business.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 inline-flex items-center rounded-full border border-border bg-card p-1 text-xs font-semibold">
            <button
              onClick={() => setBillingCycle("annual")}
              className={`rounded-full px-4 py-2 transition ${
                billingCycle === "annual"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Billed Annually{" "}
              <span className="ml-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                Save 20%
              </span>
            </button>
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-full px-4 py-2 transition ${
                billingCycle === "monthly"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Billed Monthly
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {tiers.map((t) => {
            const price = billingCycle === "annual" ? t.annualPrice : t.monthlyPrice;
            return (
              <div
                key={t.name}
                className={`relative flex flex-col rounded-3xl border p-8 transition-all ${
                  t.featured
                    ? "border-primary bg-primary text-primary-foreground shadow-2xl scale-[1.02]"
                    : "border-border bg-card text-card-foreground shadow-sm"
                }`}
              >
                {t.featured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-bold uppercase tracking-wider text-accent-foreground shadow">
                    Most Popular Choice
                  </div>
                )}

                <h3 className="font-display text-2xl font-bold">{t.name}</h3>
                <p
                  className={`mt-2 text-xs ${t.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                >
                  {t.tagline}
                </p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-bold">${price}</span>
                  <span
                    className={`text-xs ${t.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                  >
                    / month {billingCycle === "annual" ? "(billed annually)" : "(monthly term)"}
                  </span>
                </div>

                <ul className="mt-8 space-y-3 text-xs sm:text-sm flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check
                        className={`h-4 w-4 shrink-0 mt-0.5 ${t.featured ? "text-accent" : "text-primary"}`}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="/auth"
                  className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${
                    t.featured
                      ? "bg-accent text-accent-foreground hover:opacity-90 shadow-md"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  }`}
                >
                  Start Free Scan <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            );
          })}
        </div>

        {/* INTERACTIVE ROI CALCULATOR WIDGET */}
        <div
          id="calculator"
          className="mt-20 rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xl"
        >
          <div className="max-w-3xl mx-auto text-center">
            <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-bold text-accent-foreground">
              Interactive Revenue Protection Estimator
            </span>
            <h3 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-foreground">
              Calculate Your Local Business ROI
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
              See how intercepting negative reviews protects thousands in churned revenue every
              month.
            </p>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-12 items-center">
            {/* Sliders Input */}
            <div className="md:col-span-7 space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold text-foreground mb-2">
                  <span>Average Customer Transaction / Visit Value:</span>
                  <span className="text-primary font-display text-base">${avgSpend}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="500"
                  step="5"
                  value={avgSpend}
                  onChange={(e) => setAvgSpend(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>$20 (Diner/Cafe)</span>
                  <span>$250 (Auto/Dental)</span>
                  <span>$500+ (Specialty)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-foreground mb-2">
                  <span>Estimated Monthly Customer Volume:</span>
                  <span className="text-primary font-display text-base">
                    {monthlyCustomers} customers
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="25"
                  value={monthlyCustomers}
                  onChange={(e) => setMonthlyCustomers(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>50 / mo</span>
                  <span>500 / mo</span>
                  <span>2,000 / mo</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-foreground mb-2">
                  <span>Current Google Star Rating:</span>
                  <span className="text-primary font-display text-base">{currentStars}★</span>
                </div>
                <input
                  type="range"
                  min="2.5"
                  max="4.8"
                  step="0.1"
                  value={currentStars}
                  onChange={(e) => setCurrentStars(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Live Calculation Output Card */}
            <div className="md:col-span-5 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
              <div className="text-xs uppercase tracking-widest font-bold text-primary">
                Projected Annual ROI
              </div>
              <div className="mt-2 font-display text-4xl sm:text-5xl font-bold text-primary">
                {calcResults.roiMultiple}x{" "}
                <span className="text-sm font-sans font-normal text-muted-foreground">Return</span>
              </div>

              <div className="mt-6 space-y-3 text-left text-xs border-t border-primary/10 pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bad Reviews Intercepted / Mo:</span>
                  <span className="font-bold text-foreground">
                    {calcResults.interceptedReviews} reviews
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saved Annual Revenue:</span>
                  <span className="font-bold text-primary">
                    ${calcResults.savedCustomerChurnValue.toLocaleString()} / yr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Projected Rating Lift:</span>
                  <span className="font-bold text-accent-foreground">
                    +{calcResults.projectedRatingLift}★ Increase
                  </span>
                </div>
              </div>

              <a
                href="/auth"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow"
              >
                Claim This ROI Protection →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   SUPPORTING SECTION: BEFORE & AFTER CASE STUDIES
   ========================================================================= */
function BeforeAfter() {
  const cases = [
    {
      name: "Rosewood Hair Salon",
      city: "Tulsa, OK",
      before: { stars: 3.6, reviews: 84, recent: "12 of last 20 reviews were ≤ 3★" },
      after: { stars: 4.5, reviews: 167, recent: "17 of last 20 reviews are 5★" },
      timeline: "90 days",
      worked: "Removed 4 off-topic reviews · 38 amend nudges · 12 stars recovered",
    },
    {
      name: "Maple Grove Assisted Living",
      city: "Cedar Rapids, IA",
      before: { stars: 3.2, reviews: 41, recent: "Family complaints dominated page 1" },
      after: { stars: 4.4, reviews: 119, recent: "First page leads with caregiver praise" },
      timeline: "120 days",
      worked: "2 hate-speech removals granted · 78 review requests · 9 amendments earned",
    },
    {
      name: "Bay Street Dental (3 locations)",
      city: "Tampa, FL",
      before: { stars: 4.1, reviews: 312, recent: "Inconsistent — 1 site stuck at 3.4★" },
      after: { stars: 4.7, reviews: 588, recent: "All 3 locations consistently above 4.5★" },
      timeline: "180 days",
      worked: "Standardized voice across sites · 6 removals · 22 stars recovered",
    },
  ];

  return (
    <section id="proof" className="px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Proven Results</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl md:text-5xl">
            Real SMB Lifts. Real Timelines.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Composite case studies drawn directly from the playbook we execute for local business
            clients.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {cases.map((c) => (
            <div key={c.name} className="rounded-3xl border border-border bg-card p-7 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">{c.city}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
                  {c.timeline}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-secondary/30 p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Before
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-display text-2xl font-bold text-foreground">
                      {c.before.stars}
                    </span>
                    <Star className="h-3.5 w-3.5 fill-muted-foreground text-muted-foreground" />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {c.before.reviews} reviews
                  </div>
                </div>

                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    After
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-display text-2xl font-bold text-primary">
                      {c.after.stars}
                    </span>
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {c.after.reviews} reviews
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground flex items-start gap-2">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{c.worked}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   SUPPORTING SECTION: REVIEW RECOVERY LIFECYCLE TRACKER
   ========================================================================= */
function RecoveryTracker() {
  const items = [
    {
      stage: "Flagged",
      name: "Margaret L. · 2★ Google",
      detail: "Off-topic complaint about parking lot owned by adjacent business.",
      icon: CircleDot,
      status: "Policy: Off-Topic",
      tone: "muted",
    },
    {
      stage: "Submitted",
      name: "Anonymous · 1★ Yelp",
      detail: "Removal request filed. Evidence packet: 3 platform-policy citations.",
      icon: Clock,
      status: "Awaiting Review",
      tone: "accent",
    },
    {
      stage: "Removed",
      name: "J. Smith · 1★ Facebook",
      detail: "Hate-speech violation granted. +0.04★ to overall star average.",
      icon: CheckCircle2,
      status: "Granted & Removed",
      tone: "primary",
    },
    {
      stage: "Amended",
      name: "Dave R. · 2★ → 5★ Google",
      detail: "Make-It-Right nudge sent. Amended in 48 hrs. +3 stars recovered.",
      icon: CheckCircle2,
      status: "Recovered",
      tone: "primary",
    },
  ];

  return (
    <section className="bg-secondary/30 px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Live Review Pipeline
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl md:text-5xl">
            Complete Transparency Across Every Flagged Review
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Zero black-box secrets. See every review being monitored, flagged, submitted, or amended
            in real time.
          </p>
        </div>

        <div className="mt-12 rounded-3xl border border-border bg-card p-6 shadow-xl">
          <div className="divide-y divide-border/60">
            {items.map(({ icon: Icon, ...it }) => (
              <div
                key={it.name}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary mt-1 sm:mt-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                        {it.stage}
                      </span>
                      <span className="font-bold text-sm text-foreground">{it.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{it.detail}</p>
                  </div>
                </div>
                <span className="self-start sm:self-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  {it.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   SUPPORTING SECTION: PLAIN-ENGLISH TERMS & GUARANTEE
   ========================================================================= */
function Terms() {
  return (
    <section id="terms" className="px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Contract &amp; SLA Terms
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            The Terms in Plain English
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            No fine print. Here is exactly how our agreement works and how you stay protected.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display font-bold text-base text-foreground">
              14-Day Full Refund Window
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Try Expo Proxy AI for 14 days. If you aren&apos;t thrilled with our scan results or
              dashboard, receive a 100% full refund with zero hassle.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display font-bold text-base text-foreground">
              0.3-Star Rating Lift Promise
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              If your average rating doesn&apos;t lift by at least 0.3 stars in 90 days, we refund
              your most recent month and continue working free until it does.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display font-bold text-base text-foreground">
              50% Early Exit Clause
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Need to cancel your term early? Simply pay 50% of the remaining term balance. No
              hidden collections fees or legal games.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-display font-bold text-base text-foreground">
              You Own All Data &amp; Work
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              All replies published, reviews amended, and evidence packets remain yours forever. We
              never roll back work if you leave.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Guarantee() {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="mx-auto max-w-4xl rounded-3xl border border-primary/20 bg-primary/5 p-8 text-center sm:p-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <ShieldCheck className="h-7 w-7 text-accent" />
        </div>
        <h2 className="mt-6 font-display text-3xl font-bold sm:text-4xl text-foreground">
          The 0.3-Star Rating Lift Guarantee
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
          If your Google Business Profile rating does not improve by at least 0.3 stars within 90
          days, we refund your most recent month and provide our service completely free until your
          rating target is reached.
        </p>
      </div>
    </section>
  );
}

/* =========================================================================
   SUPPORTING SECTION: FAQ
   ========================================================================= */
function FAQ() {
  const faqs = [
    {
      q: "How does the closed-loop Make-It-Right engine work?",
      a: "When a customer submits feedback via SMS or email after a service, 4-5 star ratings are fast-tracked directly to your Google Business Profile. Unhappy 1-3 star ratings are held privately in an owner recovery portal, giving your team a chance to fix the issue before it damages your public rating.",
    },
    {
      q: "How does Google Business Profile Policy scanning work?",
      a: "Our AI scans your existing Google reviews against Google's official User Generated Content (UGC) policy terms—looking for off-topic rants, spam, competitor conflicts of interest, and hate speech. We generate formatted legal evidence packets for official portal submission.",
    },
    {
      q: "Is there a long demo or setup required?",
      a: "No long sales calls needed. You can run an instant scan on your Google Business Profile, connect via Google OAuth or CSV upload, and start sending requests in under 10 minutes.",
    },
    {
      q: "Will AI automatically post replies without my approval?",
      a: "Never. Our system drafts on-brand replies tailored to your industry, but every single response requires a 1-click human approval from your manager.",
    },
    {
      q: "How does Expo Proxy AI compare in price to Birdeye or Podium?",
      a: "Birdeye and Podium typically charge $399–$599/month per location with strict auto-renewing contracts. Expo Proxy AI starts at $79/month with full features, built specifically for local independent operators.",
    },
  ];

  return (
    <section id="faq" className="px-4 py-20 sm:px-6 md:py-28">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">FAQ</p>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-border bg-card p-6 open:border-primary/40 shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between font-display text-base sm:text-lg font-bold text-foreground">
                {f.q}
                <span className="ml-4 text-xl text-muted-foreground transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   CLOSING CTA & FOOTER
   ========================================================================= */
function CTA({ onRunAudit }: { onRunAudit: (e?: React.FormEvent, customName?: string) => void }) {
  return (
    <section id="cta" className="px-4 py-20 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-primary p-10 sm:p-16 text-center text-primary-foreground shadow-2xl">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/25 blur-3xl" />

        <h2 className="relative font-display text-3xl sm:text-4xl md:text-5xl font-bold">
          Ready to Stop Bad Reviews &amp; Elevate Your Google Rating?
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-sm sm:text-base text-primary-foreground/85 leading-relaxed">
          Run your free Google Business Profile scan now or start your 14-day risk-free trial. No
          sales call required.
        </p>

        <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/auth"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-accent px-8 py-3.5 text-sm font-semibold text-accent-foreground shadow-lg transition hover:opacity-90"
          >
            Start Free Scan <ArrowRight className="h-4 w-4" />
          </a>
          <button
            onClick={() => onRunAudit(undefined, "My Local Business")}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-8 py-3.5 text-sm font-semibold transition hover:bg-primary-foreground/20"
          >
            Run Business Scan Now
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/70 px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground">
            <Star className="h-3.5 w-3.5 fill-current text-accent" />
          </div>
          <span className="font-medium text-foreground">Expo Proxy AI Reputation</span> — Built for
          Independent SMBs
        </div>
        <div className="flex gap-6 font-medium">
          <a href="#terms" className="hover:text-foreground">
            Privacy &amp; Terms
          </a>
          <a href="#sla" className="hover:text-foreground">
            90% SLA
          </a>
          <a href="mailto:hello@expoproxy.com" className="hover:text-foreground">
            Contact Support
          </a>
        </div>
      </div>
    </footer>
  );
}
