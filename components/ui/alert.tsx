import * as React from "react"
import Link from "next/link"
import { cva, type VariantProps } from "class-variance-authority"
import { ExternalLink } from "lucide-react"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group/alert my-3 w-full rounded-lg border p-4 shadow-sm text-sm leading-relaxed [&_svg:not([class*='h-'])]:h-4 [&_svg:not([class*='w-'])]:w-4",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        neutral: "border-border bg-card text-card-foreground",
        info: "border-banner-info-border bg-banner-info text-banner-info-foreground",
        warning: "border-banner-warning-border bg-banner-warning text-banner-warning-foreground",
        accent: "border-accent bg-accent text-accent-foreground",
        destructive:
          "border-destructive/30 bg-destructive/10 text-foreground",
      },
      clickable: {
        true:
          "group block cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      clickable: false,
    },
  }
)

function Alert({
  className,
  variant,
  href,
  target,
  rel,
  clickable,
  showLinkIndicator = true,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & {
    href?: string
    target?: React.HTMLAttributeAnchorTarget
    rel?: string
    showLinkIndicator?: boolean
  }) {
  const isClickable = clickable ?? Boolean(href)
  const content = (
    <div className={cn("flex items-start gap-3", isClickable && "justify-between")}>
      <div className="min-w-0 flex-1">
        {children}
      </div>
      {isClickable && showLinkIndicator ? (
        <div className="hidden shrink-0 items-center gap-1 text-xs font-medium opacity-80 transition group-hover:opacity-100 sm:flex">
          <span>Read more</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </div>
      ) : null}
    </div>
  )

  if (href) {
    return (
      <div data-slot="alert-wrapper" {...props}>
        <Link
          href={href}
          target={target}
          rel={rel}
          className={cn(alertVariants({ variant, clickable: isClickable }), className)}
          data-slot="alert"
          role="alert"
        >
          {content}
        </Link>
      </div>
    )
  }

  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant, clickable: isClickable }), className)}
      {...props}
    >
      {content}
    </div>
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "mb-1 flex items-center justify-center gap-2 text-base font-semibold",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm leading-relaxed [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:opacity-90 [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-1.5 right-2", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
