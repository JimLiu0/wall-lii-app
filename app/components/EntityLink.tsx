"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";

interface EntityLinkProps {
  text: string;
  imageUrl: string;
  className?: string;
}

const EntityLink: React.FC<EntityLinkProps> = ({
  text,
  imageUrl,
  className = "",
}) => {
  const [showImage, setShowImage] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const linkRef = useRef<HTMLSpanElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

  // Handle click for mobile and hover for desktop
  const handleClick = (e: React.MouseEvent) => {
    if (!isDesktop) {
      e.preventDefault();
      setShowImage(!showImage);
      const rect = linkRef.current?.getBoundingClientRect();
      if (rect) {
        calculatePosition(rect);
      }
    }
  };

  // Show image on mouse enter (desktop only)
  const handleMouseEnter = () => {
    if (isDesktop) {
      setShowImage(true);
      const rect = linkRef.current?.getBoundingClientRect();
      if (rect) {
        calculatePosition(rect);
      }
    }
  };

  // Hide image on mouse leave (desktop only)
  const handleMouseLeave = () => {
    if (isDesktop) {
      setShowImage(false);
    }
  };

  // Calculate the position of the popup
  const calculatePosition = (rect: DOMRect) => {
    const isMobile = window.innerWidth < 768;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Initial position (centered above the element)
    let x = rect.left + rect.width / 2;
    let y = rect.top - 10;

    // The overlay width and height
    const overlayWidth = Math.min(300, viewportWidth * 0.8);
    const overlayHeight = Math.min(250, viewportHeight * 0.6);

    // Ensure image stays within viewport
    if (x - overlayWidth / 2 < 0) {
      x = overlayWidth / 2;
    } else if (x + overlayWidth / 2 > viewportWidth) {
      x = viewportWidth - overlayWidth / 2;
    }

    // Position popup below text if there's not enough room above
    if (y - overlayHeight < 0) {
      y = rect.bottom + overlayHeight / 2 + 10;
    } else {
      y = y - overlayHeight / 2;
    }

    // For mobile, center in viewport
    if (isMobile) {
      x = viewportWidth / 2;
      y = viewportHeight / 2;
    }

    setPosition({ x, y });
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showImage &&
        imageRef.current &&
        !imageRef.current.contains(event.target as Node) &&
        linkRef.current &&
        !linkRef.current.contains(event.target as Node)
      ) {
        setShowImage(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showImage]);

  return (
    <>
      <span
        ref={linkRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`text-yellow-300 hover:underline cursor-pointer ${className}`}
      >
        {text}
      </span>

      {showImage && (
        <span
          ref={imageRef}
          className="fixed z-50 flex flex-col items-center shadow-2xl rounded-md bg-gray-800 border border-gray-700"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: "translate(-50%, -50%)",
            maxWidth: "90vw",
            maxHeight: "80vh",
            width: "300px",
          }}
        >
          <span className="w-full relative">
            <button
              onClick={() => setShowImage(false)}
              className="absolute top-1 right-1 bg-gray-900 rounded-full p-1 text-gray-400 hover:text-white z-10"
              aria-label="Close"
            >
              <X size={16} />
            </button>
            <span className="p-2 w-full h-full">
              <Image
                src={imageUrl}
                alt={text}
                width={300} // arbitrary width
                height={230} // maxHeight fallback
                className="w-full h-auto object-contain rounded mx-auto"
                style={{ maxHeight: "200px" }}
                unoptimized // Optional: allows loading external images without optimization errors
              />
            </span>
          </span>
        </span>
      )}
    </>
  );
};

export default EntityLink;
