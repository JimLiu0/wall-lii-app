"use client";

import React, { useMemo } from "react";
import EntityLink from "./EntityLink";
import parse, { HTMLReactParserOptions, Element } from "html-react-parser";

interface EntityHighlighterProps {
  content: string;
  entities: Map<string, string>; // Map<entityName, imageUrl>
}

export default function EntityHighlighter({
  content,
  entities,
}: EntityHighlighterProps) {
  const sortedEntities = useMemo(() => {
    return Array.from(entities.entries())
      .filter(([url]) => !!url)
      .map(([name, imageUrl]) => ({
        name: name.replace(/\s*\(.*?\)/g, "").trim(),
        imageUrl,
      }))
      .sort((a, b) => b.name.length - a.name.length); // longest first
  }, [entities]);

  function highlightEntities(text: string): React.ReactNode[] {
    const result: React.ReactNode[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      let matched = false;

      for (const { name, imageUrl } of sortedEntities) {
        const slice = text.slice(currentIndex, currentIndex + name.length);

        if (
          slice.toLowerCase() === name.toLowerCase() &&
          (currentIndex + name.length === text.length || // end of string
            !/\p{L}/u.test(text[currentIndex + name.length])) // not a letter after
        ) {
          result.push(
            <EntityLink
              key={`${name}-${currentIndex}`}
              text={slice}
              imageUrl={imageUrl}
              className="entity-highlight"
            />,
          );
          currentIndex += name.length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        result.push(text[currentIndex]);
        currentIndex++;
      }
    }

    return result;
  }

  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode.type === "text" && "data" in domNode) {
        const text = domNode.data;
        if (!text.trim()) return domNode;
        return <>{highlightEntities(text)}</>;
      }

      if (domNode.type === "tag") {
        const element = domNode as Element;
        const skipTags = [
          "a",
          "button",
          "input",
          "textarea",
          "select",
          "option",
        ];
        if (skipTags.includes(element.name.toLowerCase())) {
          return undefined;
        }
      }

      return undefined;
    },
  };

  const processedContent = parse(content, options);

  return <div className="entity-highlighter">{processedContent}</div>;
}
