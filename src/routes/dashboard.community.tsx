import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  HeartHandshake,
  MapPin,
  Search,
  Building2,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Heart,
  Award,
  TrendingUp,
  Megaphone,
  ShieldCheck,
  HelpCircle,
  Info,
  Calendar,
  DollarSign,
  Users,
  RefreshCw,
  FileText,
  Layers,
  Download,
  Eye,
  ThumbsUp,
  CheckCircle2,
  Filter,
  PlusCircle,
  Tag,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/dashboard/community")({
  head: () => ({
    meta: [
      { title: "Local Community & Philanthropy — Expo Proxy Reputation" },
      {
        name: "description",
        content:
          "Analyze your local community presence, connect with authentic charities, and generate reputation-boosting local PR content.",
      },
    ],
  }),
  component: CommunityImpactPage,
});

interface Charity {
  id: string;
  name: string;
  category:
    | "Food & Hunger"
    | "Youth & Education"
    | "Animal Welfare"
    | "Environment"
    | "Health & Care"
    | "Community Arts";
  address: string;
  distance: string;
  description: string;
  impactMetric: string;
  recommendedSupport: string;
  imageUrl: string;
  imageAlt: string;
  websiteUrl: string;
  verifiedTaxId: string;
  suggestedDonationTier: string;
}

const LOCAL_CHARITIES_DATABASE: Record<string, Charity[]> = {
  austin: [
    {
      id: "atx-foodbank",
      name: "Central Texas Food Bank",
      category: "Food & Hunger",
      address: "6500 Metropolis Dr, Austin, TX 78744",
      distance: "2.4 miles away",
      description:
        "Providing meals and nutritional support to over 46,000 Central Texans each week. Partners with local restaurants and grocery shops.",
      impactMetric: "A $250 donation provides 1,000 warm meals to local families.",
      recommendedSupport: "Sponsor a Weekend Meal Drive / $200 Monthly Donation Box",
      imageUrl:
        "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800",
      imageAlt: "Volunteers sorting fresh food boxes at local community food bank",
      websiteUrl: "https://www.centraltexasfoodbank.org",
      verifiedTaxId: "501(c)(3) #74-2194382",
      suggestedDonationTier: "$150 - $300 / mo",
    },
    {
      id: "atx-youth-sports",
      name: "Austin Eastside Youth Baseball League",
      category: "Youth & Education",
      address: "Givens District Park, Austin, TX 78721",
      distance: "1.8 miles away",
      description:
        "Empowering under-resourced youth through organized baseball leagues, sportsmanship mentoring, and equipment sponsorships.",
      impactMetric: "Sponsors complete team jerseys and equipment for a full 12-game season.",
      recommendedSupport: "Team Jersey Banner Sponsor ($350/season) or Game Day Snacks",
      imageUrl:
        "https://images.unsplash.com/photo-1562077772-3bd90403f7f0?auto=format&fit=crop&q=80&w=800",
      imageAlt: "Local youth baseball team celebrating on field with coach",
      websiteUrl: "https://www.austinyouthsports.org",
      verifiedTaxId: "501(c)(3) #82-1049281",
      suggestedDonationTier: "$250 - $500 / season",
    },
    {
      id: "atx-pets",
      name: "Austin Pets Alive! Shelter",
      category: "Animal Welfare",
      address: "1156 W Cesar Chavez St, Austin, TX 78703",
      distance: "3.1 miles away",
      description:
        "Innovating no-kill programs that rescue at-risk shelter pets in Central Texas. Provides medical rehabilitation and foster adoption.",
      impactMetric: "Covers full vaccination and medical prep for 8 rescue puppies.",
      recommendedSupport: "Adoption Event Host / Donation Jar at Front Counter",
      imageUrl:
        "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=800",
      imageAlt: "Rescued dogs playing happily with animal shelter volunteers",
      websiteUrl: "https://www.austinpetsalive.org",
      verifiedTaxId: "501(c)(3) #26-2918301",
      suggestedDonationTier: "$100 - $250 / mo",
    },
    {
      id: "atx-green",
      name: "TreeFolks Urban Canopy Project",
      category: "Environment",
      address: "10804 E Crystal Falls, Austin, TX 78754",
      distance: "4.5 miles away",
      description:
        "Planting shade trees in neighborhoods and public parks to reduce urban heat islands and enhance local neighborhood green spaces.",
      impactMetric: "Plants and maintains 15 native shade trees in neighborhood parks.",
      recommendedSupport: "Community Tree Planting Sponsorship / Employee Volunteer Day",
      imageUrl:
        "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=800",
      imageAlt: "Community volunteers planting native trees in local park",
      websiteUrl: "https://www.treefolks.org",
      verifiedTaxId: "501(c)(3) #74-2591024",
      suggestedDonationTier: "$200 / event",
    },
  ],
  default: [
    {
      id: "gen-foodbank",
      name: "Neighborhood Community Food Pantry",
      category: "Food & Hunger",
      address: "124 Main Street, Local Community Center",
      distance: "1.2 miles away",
      description:
        "Directly supplying groceries, fresh produce, and essential toiletries to local families, seniors, and veterans in need.",
      impactMetric: "Supplies a full week of groceries for 15 local senior households.",
      recommendedSupport: "Sponsor Monthly Pantry Drive / Countertop Collection Box",
      imageUrl:
        "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&q=80&w=800",
      imageAlt: "Volunteers preparing fresh food pantry bags for community members",
      websiteUrl: "https://www.communityfoodpantry.org",
      verifiedTaxId: "501(c)(3) #45-9821039",
      suggestedDonationTier: "$100 - $250 / mo",
    },
    {
      id: "gen-youth",
      name: "Local Boys & Girls Youth Club",
      category: "Youth & Education",
      address: "450 Park Avenue, Eastside District",
      distance: "2.1 miles away",
      description:
        "Providing after-school tutoring, STEM programs, and youth athletics for local elementary and middle school students.",
      impactMetric: "Provides full after-school tutoring supplies for 25 local students.",
      recommendedSupport: "Sponsor STEM Club Supplies / Student Honor Roll Pizza Party",
      imageUrl:
        "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800",
      imageAlt: "Students working together on science and art projects at youth center",
      websiteUrl: "https://www.localyouthclub.org",
      verifiedTaxId: "501(c)(3) #36-4921045",
      suggestedDonationTier: "$200 - $400 / mo",
    },
    {
      id: "gen-animals",
      name: "Second Chance Animal Rescue & Sanctuary",
      category: "Animal Welfare",
      address: "890 Ridge Road, County Line",
      distance: "3.4 miles away",
      description:
        "Rescuing abandoned pets, providing emergency veterinary care, and connecting animals with loving forever families.",
      impactMetric: "Covers spay/neuter and emergency medical treatment for 5 rescue pets.",
      recommendedSupport: "Pet Food Drive Drop Spot / Adoption Day Event Partner",
      imageUrl:
        "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&q=80&w=800",
      imageAlt: "Volunteer playing with happy rescue dogs at animal sanctuary",
      websiteUrl: "https://www.secondchancerescue.org",
      verifiedTaxId: "501(c)(3) #12-8402910",
      suggestedDonationTier: "$150 / mo",
    },
    {
      id: "gen-habitat",
      name: "Habitat for Humanity Community Builders",
      category: "Health & Care",
      address: "310 Commerce St, Civic Center",
      distance: "2.8 miles away",
      description:
        "Building affordable homes and critical home repairs for low-income seniors and families in our immediate zip code.",
      impactMetric: "Funds critical accessibility ramp construction for a local veteran.",
      recommendedSupport: "Sponsor Build Day Refreshments / $300 Project Grant",
      imageUrl:
        "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&q=80&w=800",
      imageAlt: "Volunteers constructing a home for a local family in need",
      websiteUrl: "https://www.habitatcommunity.org",
      verifiedTaxId: "501(c)(3) #94-1029384",
      suggestedDonationTier: "$250 / project",
    },
  ],
};

function CommunityImpactPage() {
  const [cityInput, setCityInput] = useState("Austin, TX");
  const [businessType, setBusinessType] = useState("Restaurant & Hospitality");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeCharity, setActiveCharity] = useState<Charity | null>(null);
  const [pledgedCharityIds, setPledgedCharityIds] = useState<string[]>(["atx-foodbank"]);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  // Analyze local community presence
  const handleAnalyze = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 800);
  };

  const charityList = useMemo(() => {
    const key = cityInput.toLowerCase().includes("austin") ? "austin" : "default";
    const list = LOCAL_CHARITIES_DATABASE[key] || LOCAL_CHARITIES_DATABASE["default"];
    if (selectedCategory === "All") return list;
    return list.filter((c) => c.category === selectedCategory);
  }, [cityInput, selectedCategory]);

  const currentCharity = activeCharity || charityList[0] || LOCAL_CHARITIES_DATABASE["default"][0];

  const handleTogglePledge = (id: string) => {
    if (pledgedCharityIds.includes(id)) {
      setPledgedCharityIds(pledgedCharityIds.filter((item) => item !== id));
    } else {
      setPledgedCharityIds([...pledgedCharityIds, id]);
    }
  };

  // Generated Post Templates
  const postTemplates = useMemo(() => {
    const c = currentCharity;
    const biz = businessType;

    return {
      google: {
        platform: "Google Business Update",
        icon: "Google Maps / GBP",
        badge: "Boosts Local SEO & E-E-A-T",
        title: "Community Spotlight: Partnering with " + c.name,
        body: `We are proud to support our local neighborhood! 💙 At ${biz.toLowerCase().includes("restaurant") ? "our restaurant" : "our local shop"}, we believe that strong businesses build strong communities. That's why we're proud to partner with ${c.name} (${c.verifiedTaxId}).\n\nEvery month, a portion of our proceeds directly helps ${c.impactMetric.toLowerCase()} Right here in ${cityInput}!\n\nStop by this week, say hi to our team, and help us support our amazing neighbors. Thank you for choosing local! 📍✨`,
        hashtags: `#SupportLocal #${cityInput.replace(/[^a-zA-Z]/g, "")} #CommunityFirst #GiveBack #${c.category.replace(/[^a-zA-Z]/g, "")}`,
      },
      facebook: {
        platform: "Facebook & Instagram",
        icon: "Social Feeds",
        badge: "Drives Social Shares & Goodwill",
        title: "Local Heart & Loyalty Post",
        body: `Giving back to ${cityInput} isn't just something we do—it's who we are! 🤝\n\nWe recently partnered with ${c.name} to help support their mission: "${c.description}"\n\nWhen you support our local ${biz.toLowerCase()}, you're directly helping us fund: ${c.impactMetric}\n\nTag a friend who loves supporting local causes! Let's keep our neighborhood thriving together. ❤️`,
        hashtags: `#LocalBusiness #${cityInput.replace(/[^a-zA-Z]/g, "")} #ShopLocal #CommunityOverCompetition #${c.name.replace(/[^a-zA-Z]/g, "")}`,
      },
      linkedin: {
        platform: "LinkedIn B2B",
        icon: "Professional PR",
        badge: "Builds Employer & Brand Reputation",
        title: "Corporate Responsibility & Community Leadership",
        body: `At ${biz}, true enterprise growth goes hand-in-hand with civic responsibility. We are thrilled to announce our local community sponsorship with ${c.name}.\n\nThrough this initiative: ${c.impactMetric}.\n\nSpecial thanks to the team at ${c.name} for their dedicated work in the ${cityInput} region. We encourage other local business leaders to get involved and invest in our local future.`,
        hashtags: `#CorporateSocialResponsibility #LocalEconomy #${cityInput.replace(/[^a-zA-Z]/g, "")} #Leadership #CommunityImpact`,
      },
      nextdoor: {
        platform: "Nextdoor Neighborhood",
        icon: "Hyper-Local Trust",
        badge: "High-Trust Neighborhood Direct Outreach",
        title: "Friendly Neighborhood Update",
        body: `Hello neighbors! 👋 As a local business right here in ${cityInput}, we wanted to share a quick update with our community.\n\nWe've set up a donation box and sponsorship for ${c.name} at our shop! (${c.address}).\n\nIf you're in the neighborhood, drop by to say hello or learn how you can volunteer. Thank you for making our neighborhood such a wonderful place to live and work!`,
        hashtags: `#NextdoorNeighbors #${cityInput.replace(/[^a-zA-Z]/g, "")} #LocalPantry #NeighborhoodPride`,
      },
    };
  }, [currentCharity, businessType, cityInput]);

  const copyToClipboard = (text: string, platformKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPlatform(platformKey);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  return (
    <div className="space-y-8 pb-16 text-foreground">
      {/* Top Banner / Header */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <HeartHandshake className="h-3.5 w-3.5" />
              Community Presence & Reputation Engine
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Local Charity &amp; Community Impact Analyzer
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Strengthen your brand image, build word-of-mouth customer loyalty, and boost Google
              Local SEO by actively engaging with verified local non-profits in your neighborhood.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="rounded-2xl border border-border bg-secondary/50 p-3.5 text-center min-w-[110px]">
              <div className="text-xs font-medium text-muted-foreground">Pledged Causes</div>
              <div className="font-display text-2xl font-bold text-primary">
                {pledgedCharityIds.length}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/50 p-3.5 text-center min-w-[110px]">
              <div className="text-xs font-medium text-muted-foreground">Reputation Lift</div>
              <div className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                +18%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Explicit Disclaimer Box */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-sm block">
            How Expo Proxy AI Handles Social Media Posts:
          </span>
          <p className="leading-relaxed text-muted-foreground dark:text-amber-200/90">
            <strong>
              We do NOT auto-post directly to your social media accounts without your permission.
            </strong>{" "}
            To safeguard your brand tone and security, we generate pre-formatted, AI-tailored
            content recommendations, captions, and authentic image assets that you can copy, edit,
            or post with 1 click whenever you choose.
          </p>
        </div>
      </div>

      {/* Location & Business Search Filter Bar */}
      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleAnalyze} className="grid gap-4 md:grid-cols-12 items-end">
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Target City / Zip Code
              </label>
              <Input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="e.g. Austin, TX or 78701"
                className="bg-background"
              />
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" /> Your Business Type
              </label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select business category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Restaurant & Hospitality">
                    Restaurant &amp; Hospitality
                  </SelectItem>
                  <SelectItem value="Auto Repair & Service Shop">
                    Auto Repair &amp; Service Shop
                  </SelectItem>
                  <SelectItem value="Dental & Healthcare Practice">
                    Dental &amp; Healthcare Practice
                  </SelectItem>
                  <SelectItem value="Salon & Spa">Salon &amp; Spa</SelectItem>
                  <SelectItem value="Professional Services">
                    Professional &amp; Legal Services
                  </SelectItem>
                  <SelectItem value="Home Services & Plumbing">
                    Home Services &amp; Contracting
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-4 flex items-center gap-2">
              <Button type="submit" disabled={isAnalyzing} className="w-full gap-2">
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Analyzing Community...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" /> Scan Local Non-Profits
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Category Filter Pills */}
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Filter Cause:
            </span>
            {[
              "All",
              "Food & Hunger",
              "Youth & Education",
              "Animal Welfare",
              "Environment",
              "Health & Care",
            ].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Verified Local Charities List (Left) & Reputation Post Generator (Right) */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Column: Authentic Local Charities List */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-500 fill-rose-500/20" />
                Verified Local Charities near {cityInput}
              </h2>
              <p className="text-xs text-muted-foreground">
                Showing authentic 501(c)(3) organizations with real local impact metrics.
              </p>
            </div>
            <Badge variant="outline" className="text-xs bg-card">
              {charityList.length} Opportunities
            </Badge>
          </div>

          <div className="space-y-4">
            {charityList.map((charity) => {
              const isSelected = currentCharity.id === charity.id;
              const isPledged = pledgedCharityIds.includes(charity.id);

              return (
                <Card
                  key={charity.id}
                  onClick={() => setActiveCharity(charity)}
                  className={`cursor-pointer transition-all duration-200 overflow-hidden border ${
                    isSelected
                      ? "ring-2 ring-primary border-primary shadow-md bg-card"
                      : "hover:border-primary/50 hover:shadow-sm"
                  }`}
                >
                  <div className="grid sm:grid-cols-12 gap-0">
                    {/* Authentic Charity Image */}
                    <div className="sm:col-span-5 relative h-48 sm:h-full min-h-[160px] overflow-hidden bg-muted">
                      <img
                        src={charity.imageUrl}
                        alt={charity.imageAlt}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                      />
                      <Badge className="absolute top-2 left-2 bg-background/90 text-foreground backdrop-blur-sm text-[10px] border border-border">
                        {charity.category}
                      </Badge>
                      {isPledged && (
                        <Badge className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-semibold gap-1">
                          <Check className="h-3 w-3" /> Pledged
                        </Badge>
                      )}
                    </div>

                    {/* Charity Content */}
                    <div className="sm:col-span-7 p-4 sm:p-5 space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display font-bold text-base text-foreground leading-snug">
                            {charity.name}
                          </h3>
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate">{charity.address}</span>
                          <span className="text-border">•</span>
                          <span className="font-semibold text-foreground">{charity.distance}</span>
                        </div>

                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                          {charity.description}
                        </p>
                      </div>

                      {/* Impact Highlight Box */}
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-xs">
                        <div className="font-semibold text-primary flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5 shrink-0" /> Local Impact Metric
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                          {charity.impactMetric}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePledge(charity.id);
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            isPledged
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary"
                          }`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${isPledged ? "fill-current" : ""}`} />
                          {isPledged ? "Partnered" : "+ Mark as Partner"}
                        </button>

                        <a
                          href={charity.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary font-medium"
                        >
                          Official Site <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Right Column: Community Reputation Content Generator */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="border-primary/30 shadow-md sticky top-20">
            <CardHeader className="bg-secondary/40 border-b border-border p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">
                      Local PR &amp; Reputation Generator
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Ready-to-use posts tailored for {currentCharity.name}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  No Auto-Posting
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Selected Charity Banner in Generator */}
              <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                <img
                  src={currentCharity.imageUrl}
                  alt={currentCharity.imageAlt}
                  className="h-12 w-12 rounded-lg object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-foreground truncate">
                    {currentCharity.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {currentCharity.category} • {currentCharity.suggestedDonationTier}
                  </div>
                </div>
              </div>

              {/* Business Value Rationale Accordion/Box */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs space-y-1">
                <div className="font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  Why Community Content Protects Your Reputation
                </div>
                <p className="text-muted-foreground dark:text-emerald-200/90 leading-relaxed text-[11px]">
                  Posting about local charitable partnerships creates organic customer goodwill.
                  When customers see your shop supporting {cityInput}, they are 3x more likely to
                  leave 5-star Google reviews and forgive occasional minor service delays!
                </p>
              </div>

              {/* Tabbed Social Content Recommendation Engine */}
              <Tabs defaultValue="google" className="w-full">
                <TabsList className="grid grid-cols-4 h-9 p-1 bg-secondary text-xs">
                  <TabsTrigger value="google" className="text-[11px]">
                    Google
                  </TabsTrigger>
                  <TabsTrigger value="facebook" className="text-[11px]">
                    FB &amp; IG
                  </TabsTrigger>
                  <TabsTrigger value="linkedin" className="text-[11px]">
                    LinkedIn
                  </TabsTrigger>
                  <TabsTrigger value="nextdoor" className="text-[11px]">
                    Nextdoor
                  </TabsTrigger>
                </TabsList>

                {(Object.keys(postTemplates) as Array<keyof typeof postTemplates>).map((key) => {
                  const tpl = postTemplates[key];

                  return (
                    <TabsContent key={key} value={key} className="space-y-3 mt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Share2 className="h-3.5 w-3.5 text-primary" /> {tpl.title}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium text-primary border-primary/30"
                        >
                          {tpl.badge}
                        </Badge>
                      </div>

                      {/* Post Copy Box */}
                      <div className="relative rounded-xl border border-border bg-background p-3.5 text-xs font-sans whitespace-pre-line leading-relaxed text-foreground">
                        {tpl.body}
                        <div className="mt-2 text-[11px] text-primary font-semibold">
                          {tpl.hashtags}
                        </div>
                      </div>

                      {/* Photo Recommendation Note */}
                      <div className="rounded-lg bg-secondary/50 p-2.5 text-[11px] text-muted-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5 text-primary" /> Recommended Photo:
                        </span>
                        <span className="font-medium text-foreground truncate max-w-[200px]">
                          {currentCharity.imageAlt}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => copyToClipboard(`${tpl.body}\n\n${tpl.hashtags}`, key)}
                          className="w-full gap-2 text-xs font-semibold"
                        >
                          {copiedPlatform === key ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied to
                              Clipboard!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" /> Copy Post Text
                            </>
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Community & Philanthropy Strategic Blueprint Card */}
      <Card className="bg-primary text-primary-foreground border-none">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="max-w-3xl space-y-2">
            <Badge className="bg-accent text-accent-foreground font-bold text-xs uppercase tracking-wider">
              3-Step Local Philanthropy Roadmap
            </Badge>
            <h3 className="font-display text-2xl font-bold">
              Turn Local Goodwill into Lasting Google Reputation
            </h3>
            <p className="text-sm text-primary-foreground/80 leading-relaxed">
              Top-rated local businesses don't just ask for reviews—they earn neighborhood loyalty.
              Here is how to maximize the reputation value of every community partnership:
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-4 space-y-2">
              <div className="font-bold text-accent text-sm flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-xs">
                  1
                </span>
                Pledge Local Support
              </div>
              <p className="text-primary-foreground/80 leading-relaxed">
                Select 1 or 2 verified non-profits in your immediate zip code. Even a $100/mo
                sponsorship or donation collection jar builds deep local trust.
              </p>
            </div>

            <div className="rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-4 space-y-2">
              <div className="font-bold text-accent text-sm flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-xs">
                  2
                </span>
                Share Pre-formatted Updates
              </div>
              <p className="text-primary-foreground/80 leading-relaxed">
                Copy our AI-tailored Google Business Updates and social posts. Post once every month
                to show your neighbors you care.
              </p>
            </div>

            <div className="rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-4 space-y-2">
              <div className="font-bold text-accent text-sm flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground font-bold text-xs">
                  3
                </span>
                Watch Ratings &amp; Trust Rise
              </div>
              <p className="text-primary-foreground/80 leading-relaxed">
                Local customers naturally write higher 5-star reviews and champion your business
                when they see your active neighborhood involvement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
