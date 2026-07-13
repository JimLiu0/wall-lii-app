

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function EntityToggleContent({
  rawHtml,
  processedHtml,
}: {
  rawHtml: string;
  processedHtml: string;
}) {
  const [showProcessed, setShowProcessed] = useState(true);

  return (
    <div className="mb-4 flex flex-col gap-4">
      <Button
        onClick={() => setShowProcessed((current) => !current)}
        className="self-start"
      >
        {showProcessed ? "Hide" : "Show"} Images
      </Button>
      <div
        className="prose prose-lg max-w-none flex-image text-foreground
          [&>p]:block
          sm:[&>p:has(img)]:grid
          sm:[&>p:has(img)]:grid-cols-2
          [&>p>img]:w-48
          [&>p>img]:sm:w-64
          [&>p>img]:mx-auto
          [&>p>img]:h-auto
          [&>.card-grid]:grid
          [&>.card-grid]:gap-6
          [&>.card-grid]:grid-cols-1
          sm:[&>.card-grid]:grid-cols-2
          md:[&>.card-grid]:grid-cols-3
          [&_.card-grid-placeholder]:bg-muted
          [&_.card-grid-placeholder]:text-foreground
          [&_.card-grid-placeholder]:rounded
          [&_.card-grid-placeholder]:p-4
          [&_.card-grid-placeholder]:text-center
          [&_.card-grid-placeholder]:font-semibold
          [&_.card-grid-placeholder]:text-lg
          [&_.card-grid-placeholder]:border
          [&_.card-grid-placeholder]:border-border
          [&_.card-grid-placeholder]:shadow
          [&_.card-grid-item:has(.card-grid-placeholder)]:flex
          [&_.card-grid-item:has(.card-grid-placeholder)]:flex-col
          [&_.card-grid-item:has(.card-grid-placeholder)]:items-center
          [&_.card-grid-item:has(.card-grid-placeholder)]:justify-center"
        dangerouslySetInnerHTML={{
          __html: showProcessed ? processedHtml : rawHtml,
        }}
      />
    </div>
  );
}
