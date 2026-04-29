import { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;
}

export default function DashboardCard({
  title,
  description,
  children,
  className,
  headerClassName,
  titleClassName,
  descriptionClassName,
  contentClassName,
}: DashboardCardProps) {
  return (
    <Card className={className}>
      {title || description ? (
        <CardHeader className={cn("items-center text-center", headerClassName)}>
          {title ? <CardTitle className={titleClassName}>{title}</CardTitle> : null}
          {description ? (
            <CardDescription className={descriptionClassName}>
              {description}
            </CardDescription>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
