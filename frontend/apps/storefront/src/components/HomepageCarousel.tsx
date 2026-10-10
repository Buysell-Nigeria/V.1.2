import { ArrowRight, ArrowUpRight, BadgeCheck, Boxes, ChevronLeft, ChevronRight, PackageCheck, Play, ShieldCheck, ShoppingBag, Sparkles, Store, Truck } from "lucide-react";
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

function FeatureIllustration({ variant }: { variant: string }) {
  const isDelivery = variant === "delivery" || variant === "orders";
  const isBusiness = variant === "sell" || variant === "sourcing";
  return <div className={"bs-illustration-scene bs-illustration-scene--" + variant} aria-hidden="true">
    <div className="bs-art-orbit bs-art-orbit--outer"/>
    <div className="bs-art-orbit bs-art-orbit--inner"/>
    {isDelivery ? <>
      <div className="bs-art-package"><ShoppingBag size={47}/><i/></div>
      <div className="bs-art-route"><span/><span/><span/></div>
      <div className="bs-art-icon bs-art-icon--courier"><Truck size={28}/></div>
      <div className="bs-art-mini bs-art-mini--bottom"><BadgeCheck size={17}/> Delivery updates</div>
    </> : isBusiness ? <>
      <div className="bs-art-store"><div className="bs-art-store-roof"><span/><span/><span/></div><Store size={52}/><div className="bs-art-shelf"><i/><i/><i/></div></div>
      <div className="bs-art-icon bs-art-icon--growth"><Sparkles size={26}/></div>
      <div className="bs-art-mini bs-art-mini--bottom"><Boxes size={17}/> Your business</div>
    </> : <>
      <div className="bs-art-protection"><ShieldCheck size={72} strokeWidth={1.35}/><span className="bs-art-tick"><BadgeCheck size={25}/></span></div>
      <div className="bs-art-mini bs-art-mini--top"><ShoppingBag size={17}/> Shopping made easy</div>
      <div className="bs-art-icon bs-art-icon--trust"><PackageCheck size={26}/></div>
    </>}
  </div>;
}

function CarouselMedia({ slide }: { slide: Slide }) {
  // Homepage deliberately contains no video player. Real seller videos remain
  // in ProductPage and VideoFindsRail, while advertising video remains in CampaignRail.
  if (slide.kind === "campaign" && slide.image) {
    return <div className="bs-hero-campaign-media">
      <img src={slide.image} alt="" loading="lazy" onError={event => {
        event.currentTarget.style.display = "none";
        event.currentTarget.parentElement?.classList.add("bs-hero-campaign-unavailable");
      }}/>
      <span className="bs-hero-media-fallback"><Sparkles size={38}/></span>
    </div>;
  }
  if (slide.kind === "illustration" || slide.kind === "campaign") return <FeatureIllustration variant={slide.id}/>;
  return <ProductCollage images={slide.images}/>;
}

function SlideAction({ slide }: { slide: Slide }) {
  const isExternal = slide.href.startsWith("https://");
  if (isExternal) return <a className="bs-slide-action" href={slide.href} target="_blank" rel="noopener noreferrer">{slide.cta}<ArrowUpRight size={17}/></a>;
  return <Link className="bs-slide-action" to={slide.href}>{slide.cta}<ArrowRight size={17}/></Link>;
}

export function HomepageCarousel({ products = [], campaigns = [] }: { products?: Product[]; campaigns?: PromoCampaign[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);

  const slides = useMemo<Slide[]>(() => {
    const photos = products.map(p => p.image || p.images?.[0]).filter((u):u is string => Boolean(u));
    const fashion = products.filter(p => (typeof p.category === "string" ? p.category : p.category?.slug) === "fashion").map(p => p.image).filter((u):u is string => Boolean(u));
    const electronics = products.filter(p => (typeof p.category === "string" ? p.category : p.category?.slug) === "electronics").map(p => p.image).filter((u):u is string => Boolean(u));
    const generated: Slide[] = [
      {id:"shop",kicker:"THE BETTER WAY TO SHOP",title:"A little more to love.",body:"Fresh finds from Nigerian stores.",cta:"Explore products",href:"/products",kind:"products",images:photos.slice(0,3),theme:"forest"},
      {id:"fashion",kicker:"STYLE STARTS HERE",title:"Find your kind of style.",body:"Discover everyday fashion and accessories.",cta:"Shop fashion",href:"/category/fashion",kind:"products",images:fashion.length ? fashion.slice(0,3) : photos.slice(2,5),theme:"cream"},
      {id:"delivery",kicker:"FROM CART TO YOUR DOOR",title:"Know where it's going.",body:"Follow your order every step of the way.",cta:"Track orders",href:"/orders",kind:"illustration",theme:"mint"},
      {id:"electronics",kicker:"TECH & MORE",title:"Find your next upgrade.",body:"Explore useful electronics and gadgets.",cta:"Browse electronics",href:"/category/electronics",kind:"products",images:electronics.length?electronics.slice(0,3):photos.slice(5,8),theme:"charcoal"},
      {id:"trust",kicker:"SHOP WITH CONFIDENCE",title:"Make every choice count.",body:"Clear details and buyer protection.",cta:"Learn how it works",href:"/buyer-protection",kind:"illustration",theme:"cream"},
      {id:"sell",kicker:"YOUR BUSINESS ON BUYSELL",title:"A store of your own.",body:"List your products and grow.",cta:"Start selling",href:"/signup/seller",kind:"illustration",theme:"forest"},
      {id:"sourcing",kicker:"BUSINESS TO BUSINESS",title:"Need it in bulk?",body:"Find new ways to source products.",cta:"Explore sourcing",href:"/sourcing",kind:"illustration",theme:"mint"},
      {id:"orders",kicker:"ALL IN ONE PLACE",title:"Your orders, simplified.",body:"Everything important in one place.",cta:"View your orders",href:"/orders",kind:"illustration",theme:"charcoal"},
    ];
    // Paid campaigns retain their destination and visual placement, but
    // video campaigns are excluded from this image-only hero carousel.
    const live = campaigns.filter(c => c.headline || c.title || c.imageUrl || c.mediaAsset?.publicUrl).slice(0,8).map((c,i)=>{
      const media=campaignMedia(c);
      const poster=media.image || c.thumbnailUrl || undefined;
      return {id:"campaign-"+(c.id||i),kicker:"ON BUYSELL",title:(c.headline||c.title||"Discover more").trim().slice(0,68),
        body:(c.body||c.description||"").slice(0,100),cta:c.ctaText||"Explore",
        href:safeCampaignLink(c.destinationUrl||c.ctaUrl),kind:"campaign" as const,
        image:poster,theme:(i%2?"forest":"charcoal") as Slide["theme"],campaign:c};
    });
    return [generated[0]!, ...live, ...generated.slice(1)];
  }, [products,campaigns]);


  useEffect(() => {
    if (slides.length < 2 || paused || document.visibilityState !== "visible" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setCurrent(index => (index+1)%slides.length), 4000);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);
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
    onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX || null)} onTouchEnd={touchEnd}>
    <div className="bs-slide-copy" key={active.id}>
      <span className="bs-slide-eyebrow"><span className="bs-slide-eyebrow-dot" />{active.kicker}</span>
      <h1>{active.title}</h1>
      {active.body && <p>{active.body}</p>}
      <SlideAction slide={active}/>
      <div className="bs-slide-trust"><span><BadgeCheck size={15}/> Trusted marketplace</span><span><Truck size={15}/> Managed delivery</span></div>
    </div>
    <div className="bs-slide-media" key={active.id + "-media"}><CarouselMedia slide={active}/></div>
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

/** Genuine item videos from seller listings. No mock adverts or stock videos. */
export function VideoFindsRail({ products = [] }: { products?: Product[] }) {
  const items = products.filter(p => Boolean(p.videoUrl)).slice(0, 6);
  if (!items.length) return null;
  return <section className="bs-ad-rail container" aria-label="Video product previews">
    <div className="bs-ad-rail-title"><div><span>REAL PRODUCT VIDEOS</span><h2>See it in action</h2></div><small>Actual videos uploaded with product listings</small></div>
    <div className="bs-ad-cards">
      {items.map(item => <article className="bs-ad-card" key={item.id}>
        <div className="bs-ad-card-art"><video controls playsInline preload="metadata" poster={item.image} aria-label={`Video preview of ${item.name}`}>
          <source src={item.videoUrl} />
          Your browser cannot play this product video.
        </video><span className="bs-ad-label"><Play size={11}/> PRODUCT VIDEO</span></div>
        <div className="bs-ad-body"><h3>{item.name}</h3><p>From {item.store?.name || "a BUYSELL seller"}</p>
        <Link to={`/product/${encodeURIComponent(item.slug)}`}>See product details <ArrowRight size={15}/></Link></div>
      </article>)}
    </div>
  </section>;
}
