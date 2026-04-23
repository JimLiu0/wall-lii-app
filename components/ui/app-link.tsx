import Link from "next/link"
import { type ComponentProps } from "react"

import { cn } from "@/lib/utils"

type AppLinkProps = ComponentProps<typeof Link>

function AppLink({ className, ...props }: AppLinkProps) {
  return (
    <Link
      className={cn(
        "font-medium text-link underline-offset-4 transition-colors hover:text-link-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded-sm",
        className
      )}
      {...props}
    />
  )
}

export { AppLink }
