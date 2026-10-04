import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="light"
    position="top-center"
    className="toaster group"
    icons={{
      success: <CircleCheckIcon className="size-5 text-success" />,
      info: <InfoIcon className="size-5 text-sky-accent" />,
      warning: <TriangleAlertIcon className="size-5 text-warning" />,
      error: <OctagonXIcon className="size-5 text-danger" />,
      loading: <Loader2Icon className="size-5 animate-spin text-brand-hover" />,
    }}
    toastOptions={{
      classNames: {
        toast:
          "!rounded-2xl !border !border-slate-100 !bg-white !p-4 !font-sans !text-ink !shadow-lift",
        title: "!font-heading !font-semibold !text-ink",
        description: "!text-ink-soft",
      },
    }}
    {...props}
  />
)

export { Toaster }
