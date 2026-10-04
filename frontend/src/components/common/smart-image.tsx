import { useState } from "react"
import { ImageIcon } from "lucide-react"
import { cn } from "cn"

type SmartImageProps = {
  src: string
  alt: string
  className?: string
  imgClassName?: string
}

/** Image with a soft branded placeholder while loading or when the source fails. */
function SmartImage({ src, alt, className, imgClassName }: SmartImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading")
  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br from-cream via-brand-soft to-sky-100", className)}>
      {status !== "loaded" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-amber-700/60">
          <ImageIcon className={cn("size-8", status === "loading" && "animate-pulse")} />
          {status === "error" && <span className="px-2 text-center text-xs font-medium">{alt}</span>}
        </div>
      )}
      {status !== "error" && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={cn(
            "size-full object-cover transition-opacity duration-500",
            status === "loaded" ? "opacity-100" : "opacity-0",
            imgClassName
          )}
        />
      )}
    </div>
  )
}

export { SmartImage }
