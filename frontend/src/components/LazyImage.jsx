import { useState } from "react";
import { API_BASE } from "../lib/api";

export const getAssetUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  return `${API_BASE}${value.startsWith("/") ? value : `/${value}`}`;
};

export default function LazyImage({ src, alt, className = "" }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const url = getAssetUrl(src);
  if (!url) return null;
  return (
    <div className={`lazy-img-wrap ${className}`}>
      {!loaded && !error && <div className="lazy-img-skel" />}
      <img
        src={url}
        alt={alt}
        className={`lazy-img${loaded ? " loaded" : ""}${error ? " error" : ""}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
}

export { LazyImage };
