import { ImageOff, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState, type HTMLAttributes, type ImgHTMLAttributes } from "react";

type Props = {
  sources?: (string | undefined | null)[];
  alt?: string;
  loading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
  decoding?: ImgHTMLAttributes<HTMLImageElement>["decoding"];
  className?: string;
  fit?: "contain" | "cover";
  placeholderLabel?: string;
  onUnavailable?: () => void;
} & Pick<HTMLAttributes<HTMLDivElement>, "style">;

/** Never render the broken <img> icon or huge replacement alt text.
 * Attempts each real seller media URL in order. Doesn't invent imagery.
 */
export function ProductMediaImage({
  sources = [], alt = "Product photo", loading = "lazy", decoding = "async",
  className = "", fit = "contain", placeholderLabel = "Photo unavailable",
  onUnavailable, style,
}: Props) {
  const options = useMemo(() => [...new Set(sources.filter((s): s is string =>
    typeof s === "string" && /^https?:\/\//i.test(s)))], [sources.join("|")]);
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setCurrent(0); setFailed(false); }, [options.join("|")]);
  const address = options[current];
  const unavailable = failed || !address;
  return <div className={`bs-product-media ${className}`} style={style} aria-label={alt}>
    {!unavailable ? <img src={address} alt="" loading={loading} decoding={decoding}
      style={{ objectFit: fit }} onError={() => {
        if (current+1 < options.length) setCurrent(i=>i+1);
        else { setFailed(true); onUnavailable?.(); }
      }} />
    : <div className="bs-product-photo-unavailable" role="img" aria-label={`${alt} — image currently unavailable`}>
        <span className="bs-image-placeholder-icon"><ImageOff size={27} strokeWidth={1.6}/></span>
        <span>{placeholderLabel}</span>
        <small>Image missing from seller storage</small>
      </div>}
  </div>;
}
