import * as React from "react"
import Link from "next/link"
import { cva, type VariantProps } from "class-variance-authority"

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
          "block transition duration-200 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
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
      {icon ? <div className="mt-0.5 shrink-0">{icon}</div> : null}
      <div className="min-w-0 flex-1 text-center">
        {title && (
          <div className="mb-1">
            <h3 className="text-base font-semibold">{title}</h3>
          </div>
        )}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
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
