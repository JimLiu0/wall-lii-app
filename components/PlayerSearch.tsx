'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';

export default function PlayerSearch() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEditing(false);
        setInputValue('');
        setError('');
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (isEditing && formRef.current && !formRef.current.contains(e.target as Node)) {
        setIsEditing(false);
        setInputValue('');
        setError('');
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

  const checkPlayerExists = async (playerName: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('leaderboard_snapshots')
        .select('player_name')
        .eq('player_name', playerName)
        .limit(1);

      if (error) {
        console.error('Error checking player:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking player:', error);
      return false;
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedValue = inputValue.trim().toLowerCase();
    
    if (!trimmedValue) {
      setIsEditing(false);
      setInputValue('');
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');

    const playerExists = await checkPlayerExists(trimmedValue);
    
    if (playerExists) {
      router.push(`/stats/${trimmedValue.toLowerCase()}`);
    } else {
      setError(`Player "${trimmedValue}" not found.`);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w mx-auto">
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
            onChange={(e) => {
              setInputValue(e.target.value);
              if (error) setError(''); // Clear error when user types
            }}
            placeholder="Search for a player's stats"
            className="w-full pl-10 pr-20 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
            autoFocus
            disabled={isLoading}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            <button
              type="submit"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
              aria-label="Submit search"
              disabled={isLoading}
            >
              {isLoading ? '⏳' : '✓'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setInputValue('');
                setError('');
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
              aria-label="Cancel search"
              disabled={isLoading}
            >
              ✕
            </button>
          </div>
        </form>
      ) : (
        <button
          className="flex items-center w-full text-left gap-3 cursor-pointer bg-gray-800 border border-gray-700 px-4 py-3 rounded-lg hover:border-blue-500 transition-colors"
          onClick={() => {
            setIsEditing(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-search text-gray-400" viewBox="0 0 16 16">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
          </svg>
          <span className="text-gray-400">Search for a player&apos;s stats</span>
        </button>
      )}
      
      {error && (
        <div className="mt-2 text-red-400 text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
} 