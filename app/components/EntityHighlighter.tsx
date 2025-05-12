"use client";

import React, { useMemo } from "react";
import EntityLink from "./EntityLink";
import parse, { domToReact, HTMLReactParserOptions, Element, Text } from "html-react-parser";

interface EntityHighlighterProps {
  content: string;
  entities: Map<string, string>;
}

export default function EntityHighlighter({ content, entities }: EntityHighlighterProps) {
  // Sort entities by length (longest first) to handle overlapping mentions
  const sortedEntities = useMemo(() => {
    return Array.from(entities.entries())
      .filter(([_, imageUrl]) => !!imageUrl) // Only include entities with images
      .sort(([a], [b]) => b.length - a.length); // Sort by entity name length (longest first)
  }, [entities]);

  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      // Only process text nodes
      if (domNode.type === 'text' && domNode.data) {
        const text = (domNode as Text).data;
        
        // Skip empty nodes
        if (!text.trim()) return domNode;
        
        // Build segments of text and EntityLink components
        const segments: React.ReactNode[] = [];
        let currentText = text;
        let lastIndex = 0;
        
        // For each entity, check if it's in the text
        for (const [entity, imageUrl] of sortedEntities) {
          let startIndex = 0;
          let found = false;
          
          // Create a regex that matches whole words
          const regex = new RegExp(`\\b${entity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
          let match;
          
          while ((match = regex.exec(currentText)) !== null) {
            found = true;
            const matchStart = match.index;
            const matchEnd = matchStart + match[0].length;
            
            // Add text before the match
            if (matchStart > startIndex) {
              segments.push(currentText.substring(startIndex, matchStart));
            }
            
            // Add the entity link
            segments.push(
              <EntityLink 
                key={`${entity}-${lastIndex}-${matchStart}`}
                text={match[0]} 
                imageUrl={imageUrl} 
                className="entity-highlight"
              />
            );
            
            startIndex = matchEnd;
          }
          
          // If we found matches, update the current text
          if (found) {
            if (startIndex < currentText.length) {
              segments.push(currentText.substring(startIndex));
            }
            
            // Set currentText to a placeholder to avoid re-processing
            currentText = Array(currentText.length).fill(' ').join('');
          }
        }
        
        // If we processed any entities, return the segments
        if (segments.length > 0) {
          return <>{segments.length ? segments : currentText}</>;
        }
      }
      
      // Handle elements with children
      if (domNode.type === 'tag') {
        const element = domNode as Element;
        
        // Don't process these elements
        const skipTags = ['a', 'button', 'input', 'textarea', 'select', 'option'];
        if (skipTags.includes(element.name.toLowerCase())) {
          return undefined; // Return undefined to keep original element
        }
      }
      
      return undefined; // Default behavior - don't modify
    }
  };

  // Use html-react-parser to convert HTML string to React components
  const processedContent = parse(content, options);

  return (
    <div className="entity-highlighter">
      {processedContent}
    </div>
  );
}