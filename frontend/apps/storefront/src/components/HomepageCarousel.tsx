import { ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Boxes, ChevronLeft, ChevronRight, PackageCheck, Play, ShieldCheck, ShoppingBag, Sparkles, Store, Truck } from "lucide-react";
import { useEffect, useMemo, useState, type TouchEvent } from "react";
import { Link } from "react-router-dom";
import type { Product } from "../lib/types";

export interface PromoCampaign {
  id?: string;
  headline?: string | null;
  title?: string | null;
  body?: string | null;
  description?: string | null;
  destinationUrl?: string | null;
  ctaUrl?: string | null;
  ctaText?: string | null;
  placement?: string | null;
  mediaAsset?: { publicUrl?: string | null; mimeType?: string | null; kind?: string | null } | null;
  mediaUrl?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
}

interface Slide {
  id: string;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  kind: "products" | "illustration" | "campaign";
  image?: string;
  images?: string[];
  video?: string;
  campaign?: PromoCampaign;
  theme: "forest" | "cream" | "charcoal" | "mint";
}

export function safeCampaignLink(value: string | null | undefined): string {
  if (!value) return "/products";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "/products";
  } catch {
    return "/products";
  }
}

export function campaignMedia(campaign: PromoCampaign) {
  const url = campaign.mediaAsset?.publicUrl || campaign.videoUrl || campaign.mediaUrl || campaign.imageUrl || "";
  const video = /\.(?:mp4|webm|ogg)(?:\?|$)/i.test(url) ||
    campaign.mediaAsset?.kind === "VIDEO" || campaign.mediaAsset?.mimeType?.startsWith("video/");
  return { image: video ? campaign.imageUrl || campaign.thumbnailUrl || "" : url, video: video ? url : "" };
}

function ProductCollage({ images }: { images?: string[] }) {
  const valid = (images || []).filter(Boolean).slice(0, 3);
  if (!valid.length) {
    return <div className="bs-hero-illustration" aria-hidden="true">
      <span className="bs-illustration-main"><ShoppingBag size={83} strokeWidth={1.25} /></span>
      <span className="bs-illustration-floating top"><Sparkles size={26} /></span>
      <span className="bs-illustration-floating bottom"><PackageCheck size={26} /></span>
    </div>;
  }
  return <div className="bs-hero-product-stack" aria-label="Examples of real BUYSELL products">
    {valid.map((url, index) => (
      <div className={`bs-stack-image bs-stack-image-${index+1}`} key={url}>
        <img src={url} alt={`Product example ${index+1}`} loading={index === 0 ? "eager" : "lazy"} decoding="async" />
      </div>
    ))}
  </div>;
}

function CarouselMedia({ slide, active }: { slide: Slide; active: boolean }) {
  if (slide.video) {
    return <div className="bs-hero-campaign-media">
      <video controls={active} preload={active ? "metadata" : "none"} playsInline muted poster={slide.image || undefined}
        aria-label={slide.title} onPlay={() => document.dispatchEvent(new Event("bs:promo-video-playing"))} onPause={() => document.dispatchEvent(new Event("bs:promo-video-paused"))}>
        <source src={slide.video} />
        This video cannot play on your browser. Open the promotion instead.
      </video>
      <div className="bs-campaign-video-badge"><Play size={15} /> Video promotion</div>
    </div>;
  }
  if (slide.kind === "campaign" && slide.image) {
    return <div className="bs-hero-campaign-media"><img src={slide.image} alt="" loading="lazy" /></div>;
  }
  if (slide.kind === "illustration") {
    return <div className="bs-hero-illustration" aria-hidden="true">
      <span className="bs-illustration-main">{slide.id === "sell" ? <Store size={85} strokeWidth={1.3}/> : <ShieldCheck size={84} strokeWidth={1.25}/>}</span>
      <span className="bs-illustration-floating top">{slide.id === "sell" ? <Boxes size={28}/> : <BadgeCheck size={28}/>}</span>
      <span className="bs-illustration-floating bottom"><Truck size={27}/></span>
    </div>;
  }
  return <ProductCollage images={slide.images} />;
}

function SlideAction({ slide }: { slide: Slide }) {
  const isExternal = slide.href.startsWith("https://");
  if (isExternal) return <a className="bs-slide-action" href={slide.href} target="_blank" rel="noopener noreferrer">{slide.cta}<ArrowUpRight size={17}/></a>;
  return <Link className="bs-slide-action" to={slide.href}>{slide.cta}<ArrowRight size={17}/></Link>;
}

export function HomepageCarousel({ products = [], campaigns = [] }: { products?: Product[]; campaigns?: PromoCampaign[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const slides = useMemo<Slide[]>(() => {
    const photos = products.map(product => product.image).filter((url): url is string => Boolean(url));
    const generated: Slide[] = [
      { id: "shop", kicker: "DISCOVER WHAT'S NEW", title: "Find something you'll love.", body: "Real finds from Nigerian stores, all in one place.", href: "/products", cta: "Explore products", kind: "products", images: photos.slice(0,3), theme: "forest" },
      { id: "trust", kicker: "SHOP WITH CONFIDENCE", title: "Every order, clearer.", body: "Stay in control from checkout to delivery.", href: "/buyer-protection", cta: "How it works", kind: "illustration", theme: "cream" },
      { id: "sell", kicker: "FOR YOUR BUSINESS", title: "Your store starts here.", body: "List products and manage your sales in one place.", href: "/signup/seller", cta: "Start selling", kind: "illustration", theme: "mint" },
    ];
    const live = campaigns.filter(c => c.headline || c.title || c.mediaAsset?.publicUrl || c.imageUrl || c.videoUrl).slice(0,8).map((c, i) => {
      const media = campaignMedia(c);
      const heading = (c.headline || c.title || "Discover something new").trim().slice(0,90);
      return { id: `campaign-${c.id || i}`, kicker: "LIVE ON BUYSELL", title: heading, body: (c.body || c.description || "").slice(0,140),
        href: safeCampaignLink(c.destinationUrl || c.ctaUrl), cta: c.ctaText || "Explore", kind: "campaign" as const,
        image: media.image, video: media.video, theme: (i % 2 === 0 ? "charcoal" : "forest") as Slide["theme"], campaign: c };
    });
    return [generated[0]!, ...live, generated[1]!, generated[2]!];
  }, [products,campaigns]);

  useEffect(() => {
    const play = () => setPlaying(true);
    const stop = () => setPlaying(false);
    document.addEventListener("bs:promo-video-playing", play);
    document.addEventListener("bs:promo-video-paused", stop);
    return () => { document.removeEventListener("bs:promo-video-playing", play); document.removeEventListener("bs:promo-video-paused", stop); };
  }, []);

  useEffect(() => {
    if (slides.length < 2 || paused || playing || document.visibilityState !== "visible" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setCurrent(index => (index+1)%slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [slides.length, paused, playing]);
  useEffect(() => {
    const change = () => setPaused(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  useEffect(() => { if (current >= slides.length) setCurrent(0); }, [current,slides.length]);

  const active = slides[current] || slides[0]!;
  const next = () => setCurrent(x => (x+1)%slides.length);
  const previous = () => setCurrent(x => (x+slides.length-1)%slides.length);
  const touchEnd = (event: TouchEvent) => {
    if (touchStart === null) return;
    const diff = event.changedTouches[0]!.clientX - touchStart;
    if (Math.abs(diff)>45) diff>0 ? previous() : next();
    setTouchStart(null);
  };

  return <section aria-label="Discover BUYSELL" aria-roledescription="carousel"
    className={`bs-promo-hero bs-promo-hero--${active.theme} container`}
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocus={() => setPaused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
    onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX || null)} onTouchEnd={touchEnd}>
    <div className="bs-slide-copy" key={active.id}>
      <span className="bs-slide-eyebrow"><span className="bs-slide-eyebrow-dot" />{active.kicker}</span>
      <h1>{active.title}</h1>
      {active.body && <p>{active.body}</p>}
      <SlideAction slide={active}/>
      <div className="bs-slide-trust"><span><BadgeCheck size={15}/> Trusted marketplace</span><span><Truck size={15}/> Managed delivery</span></div>
    </div>
    <div className="bs-slide-media" key={active.id + "-media"}><CarouselMedia slide={active} active/></div>
    {slides.length>1 && <div className="bs-carousel-controls">
      <div className="bs-carousel-dots" role="group" aria-label="Choose carousel slide">{slides.map((slide,index)=><button type="button" key={slide.id} className={index===current?"active":""} aria-label={`Go to slide ${index+1}: ${slide.title}`} aria-current={index===current ? "true" : undefined} onClick={()=>setCurrent(index)}/>)}</div>
      <div className="bs-carousel-arrows"><button type="button" onClick={previous} aria-label="Previous slide"><ChevronLeft size={18}/></button><button type="button" onClick={next} aria-label="Next slide"><ChevronRight size={18}/></button></div>
    </div>}
  </section>;
}

export function CampaignRail({ campaigns = [] }: { campaigns?: PromoCampaign[] }) {
  if (!campaigns.length) return null;
  return <section className="bs-ad-rail container" aria-label="BUYSELL promotions">
    <div className="bs-ad-rail-title"><div><span>ON BUYSELL</span><h2>Promotions & stories</h2></div><small>From campaigns currently running on BUYSELL</small></div>
    <div className="bs-ad-cards">
      {campaigns.map((campaign,index) => {
        const media=campaignMedia(campaign);
        const title=campaign.headline||campaign.title||"Explore this promotion";
        const href=safeCampaignLink(campaign.destinationUrl||campaign.ctaUrl);
        return <article className="bs-ad-card" key={campaign.id||index}>
          <div className="bs-ad-card-art">
            {media.video ? <video playsInline controls preload="metadata" poster={media.image||undefined} aria-label={title}><source src={media.video}/></video>
              : media.image ? <img src={media.image} alt="" loading="lazy" decoding="async"/>
              : <div className="bs-ad-illustration"><Sparkles size={46}/></div>}
            <span className="bs-ad-label">{media.video?"VIDEO":"PROMOTION"}</span>
          </div>
          <div className="bs-ad-body"><h3>{title}</h3>{campaign.body&&<p>{campaign.body}</p>}
            {href.startsWith("https://")?<a href={href} target="_blank" rel="noopener noreferrer">View promotion <ArrowUpRight size={15}/></a>
              :<Link to={href}>View promotion <ArrowRight size={15}/></Link>}</div>
        </article>;
      })}
    </div>
  </section>;
}
