import { ChevronLeft, ChevronRight, Expand, ImageOff, PlayCircle, X } from "lucide-react";
import { useEffect, useMemo, useState, type TouchEvent } from "react";
import { ProductMediaImage } from "./ProductMediaImage";

export function ProductGallery({
  name, images = [], videoUrl,
}: {name:string; images?:string[]; videoUrl?:string}) {
  const photos = useMemo(() => [...new Set(images.filter(Boolean))], [images.join("|")]);
  const total = photos.length + (videoUrl?1:0);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [touchStart, setTouchStart] = useState<number|null>(null);
  useEffect(() => {setActive(0);setExpanded(false)},[name]);
  useEffect(()=>{
    if (!expanded) return;
    const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setExpanded(false);if(event.key==="ArrowLeft")setActive(i=>(i+total-1)%total);if(event.key==="ArrowRight")setActive(i=>(i+1)%total)};
    window.addEventListener("keydown",close);
    return ()=>window.removeEventListener("keydown",close);
  },[expanded,total]);
  const next = () => setActive(i=>(i+1)%total);
  const previous = () => setActive(i=>(i+total-1)%total);
  const slideFromTouch = (event:TouchEvent) => {
    if(touchStart===null || total<2)return;
    const delta=event.changedTouches[0]!.clientX-touchStart;
    if(Math.abs(delta)>48)delta<0?next():previous();
    setTouchStart(null);
  };
  const isVideo=Boolean(videoUrl) && active===photos.length;
  const body=<>
    {isVideo ?
      <video key={videoUrl} controls playsInline preload="metadata" aria-label={`Video of ${name}`}>
        <source src={videoUrl}/><p>Video unavailable in this browser.</p>
      </video>
      : <ProductMediaImage key={photos[active]||"none"} alt={name} sources={photos[active]?[photos[active]!, ...photos.filter((_,i)=>i!==active)]:[]} 
        loading="eager" fit="contain" placeholderLabel="Seller image unavailable"/>}
  </>;
  return <section className="product-gallery bs-product-gallery" aria-label={`Photos and videos of ${name}`}>
    <div className="product-gallery__main bs-gallery-view" onTouchStart={e=>setTouchStart(e.touches[0]?.clientX||null)} onTouchEnd={slideFromTouch}>
      {body}
      {total>1&&<div className="bs-gallery-controls"><button type="button" onClick={previous} aria-label="Previous photo"><ChevronLeft size={20}/></button><span>{active+1} / {total}</span><button type="button" onClick={next} aria-label="Next photo"><ChevronRight size={20}/></button></div>}
      {!isVideo&&photos.length>0&&<button type="button" className="bs-gallery-expand" aria-label="Enlarge product photo" onClick={()=>setExpanded(true)}><Expand size={17}/></button>}
    </div>
    {total>1&&<div className="product-gallery__thumbs bs-gallery-thumbnails" role="group" aria-label="Choose a product photo">
      {photos.map((url,index)=><button className={active===index?"is-active":""} type="button" onClick={()=>setActive(index)} 
        key={url} aria-label={`View image ${index+1} of ${photos.length}`} aria-pressed={active===index}>
        <ProductMediaImage sources={[url]} alt={`${name} photo ${index+1}`} placeholderLabel="" fit="contain"/>
      </button>)}
      {videoUrl&&<button type="button" onClick={()=>setActive(photos.length)} className={isVideo?"is-active bs-video-thumb":"bs-video-thumb"} aria-label="Watch product video" aria-pressed={isVideo}><PlayCircle size={24}/><small>Video</small></button>}
    </div>}
    {total===1&&!isVideo&&<div className="bs-gallery-caption"><ImageOff size={14}/> Additional seller photos appear here when available.</div>}
    {expanded&&photos.length>0&&<div className="bs-gallery-lightbox" role="dialog" aria-modal="true" aria-label={`Enlarged photo of ${name}`} onClick={()=>setExpanded(false)}>
      <button type="button" className="bs-gallery-lightbox-close" aria-label="Close enlarged image" onClick={()=>setExpanded(false)}><X size={22}/></button>
      <div className="bs-gallery-lightbox-photo" onClick={e=>e.stopPropagation()}><ProductMediaImage alt={name} sources={photos[active]?[photos[active]!, ...photos.filter((_,i)=>i!==active)]:photos} fit="contain" loading="eager" placeholderLabel="Seller image unavailable"/></div>
      {total>1&&<div className="bs-gallery-lightbox-controls" onClick={e=>e.stopPropagation()}><button onClick={previous} aria-label="Previous photo"><ChevronLeft size={21}/></button><span>{active+1} / {photos.length}</span><button onClick={next} aria-label="Next photo"><ChevronRight size={21}/></button></div>}
    </div>}
  </section>;
}
