import * as React from "react"
import Link from "next/link"
import { cva, type VariantProps } from "class-variance-authority"
import { ExternalLink } from "lucide-react"

import { cn } from "@/lib/utils"

const bannerVariants = cva(
  "mb-3 rounded-lg border p-4 shadow-sm",
  {
    variants: {
      variant: {
        neutral: "border-border bg-card text-card-foreground",
        info: "border-banner-info-border bg-banner-info text-banner-info-foreground",
        warning:
          "border-banner-warning-border bg-banner-warning text-banner-warning-foreground",
        accent: "border-accent bg-accent text-accent-foreground",
      },
      clickable: {
        true:
          "group block cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        false: "",
      },
    },
    defaultVariants: {
      variant: "neutral",
      clickable: false,
    },
  }
)

type BannerProps = React.PropsWithChildren<
  React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof bannerVariants> & {
      icon?: React.ReactNode
      title?: React.ReactNode
      href?: string
      target?: React.HTMLAttributeAnchorTarget
      rel?: string
    }
>

function Banner({
  className,
  icon,
  title,
  children,
  variant = "neutral",
  href,
  target,
  rel,
  ...props
}: BannerProps) {
  const clickable = Boolean(href)
  const containerClasses = cn(
    bannerVariants({ variant, clickable }),
    className
  )

  const content = (
    <div className="flex items-start gap-3">
      <div className={cn("min-w-0 flex-1 text-center", clickable && "text-left")}>
        {title && (
          <div className={cn("mb-1 flex items-center gap-2 justify-center", clickable && "justify-start")}>
            {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
            <h3 className={cn("text-base font-semibold", clickable && "underline decoration-transparent underline-offset-4 transition group-hover:decoration-current")}>
              {title}
            </h3>
          </div>
        )}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
      {clickable && (
        <div className="hidden shrink-0 items-center gap-1 text-xs font-medium opacity-80 transition group-hover:opacity-100 sm:flex">
          <span>Read more</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <div data-slot="banner-wrapper" {...props}>
        <Link
          href={href}
          target={target}
          rel={rel}
          className={containerClasses}
          data-slot="banner"
        >
          {content}
        </Link>
      </div>
    )
  }

  return (
    <div
      data-slot="banner"
      className={containerClasses}
      {...props}
    >
      {content}
    </div>
  )
}

export { Banner, bannerVariants }
