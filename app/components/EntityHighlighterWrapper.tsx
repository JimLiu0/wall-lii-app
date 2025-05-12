"use client";

import dynamic from "next/dynamic";

const EntityHighlighter = dynamic(
  () => import("./EntityHighlighter"),
  { ssr: false }
);

interface EntityHighlighterWrapperProps {
  content: string;
  entities: Map<string, string>;
}

export default function EntityHighlighterWrapper(props: EntityHighlighterWrapperProps) {
  return <EntityHighlighter {...props} />;
}