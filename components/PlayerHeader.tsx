'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PlayerHeaderProps {
  backUrl: string;
}

export default function PlayerHeader({ backUrl }: PlayerHeaderProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditing(false);
        setInputValue('');
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (isEditing && formRef.current && !formRef.current.contains(e.target as Node)) {
        setIsEditing(false);
        setInputValue('');
      }
    };

    if (isEditing) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inputValue.trim()) {
      router.push(`/stats/${inputValue.toLowerCase().trim()}`);
    } else {
      setIsEditing(false);
      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <Link
        href={backUrl}
        className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center text-blue-400 hover:text-blue-300 transition-colors px-3 py-2 rounded-lg hover:bg-gray-800"
      >
        <svg
          className="w-5 h-5 sm:mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        <span>Back to Leaderboard</span>
      </Link>
      
      <div className="flex-1 w-full">
        {isEditing ? (
          <form ref={formRef} onSubmit={handleSubmit} className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-search text-gray-400" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
                </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search for a player"
              className="w-full pl-10 pr-20 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                <button
                  type="submit"
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                  aria-label="Submit search"
                >
                    ✓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setInputValue('');
                  }}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                  aria-label="Cancel search"
                >
                    ✕
                </button>
            </div>
          </form>
        ) : (
          <button
            className="flex items-center w-full text-left gap-3 cursor-pointer bg-gray-800 border border-gray-700 px-4 py-2 rounded-lg hover:border-blue-500 transition-colors"
            onClick={() => {
              setIsEditing(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-search text-gray-400" viewBox="0 0 16 16">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
            </svg>
            <span className="text-gray-400">Search for a player</span>
          </button>
        )}
      </div>
    </div>
  );
} 