

"use client";

import { useState } from "react";

export function EntityToggleContent({
  rawHtml,
  processedHtml,
}: {
  rawHtml: string;
  processedHtml: string;
}) {
  const [showProcessed, setShowProcessed] = useState(true);

  return (
    <div className="mb-4">
      <button
        onClick={() => setShowProcessed(!showProcessed)}
        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white"
      >
        {showProcessed ? "Hide" : "Show"} Images
      </button>
      <div
        className="prose prose-lg prose-invert max-w-none flex-image
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
          [&_.card-grid-placeholder]:bg-gray-800
          [&_.card-grid-placeholder]:text-white
          [&_.card-grid-placeholder]:rounded
          [&_.card-grid-placeholder]:p-4
          [&_.card-grid-placeholder]:text-center
          [&_.card-grid-placeholder]:font-semibold
          [&_.card-grid-placeholder]:text-lg
          [&_.card-grid-placeholder]:border
          [&_.card-grid-placeholder]:border-gray-700
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