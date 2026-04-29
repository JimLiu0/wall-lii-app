'use client';

import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

import { playerExistsInSnapshots } from '@/utils/playerUtils';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface PlayerSearchProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onSearch?: (value: string) => void | Promise<void>;
  onClear?: () => void;
  placeholder?: string;
  buttonLabel?: string;
  inputId?: string;
  disabled?: boolean;
  className?: string;
}

export default function PlayerSearch({
  value,
  onValueChange,
  onSearch,
  onClear,
  placeholder = 'Search for a player...',
  buttonLabel = 'Search',
  inputId = 'player-search',
  disabled = false,
  className,
}: PlayerSearchProps = {}) {
  const router = useRouter();
  const clearPointerHandledRef = useRef(false);
  const [uncontrolledValue, setUncontrolledValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const inputValue = value ?? uncontrolledValue;

  const updateInputValue = (nextValue: string) => {
    onValueChange?.(nextValue);
    if (value === undefined) {
      setUncontrolledValue(nextValue);
    }
  };

  const handleClear = () => {
    flushSync(() => {
      updateInputValue('');
      setError('');
    });
    onClear?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValue = inputValue.trim();

    if (onSearch) {
      setIsLoading(true);
      setError('');

      try {
        await onSearch(trimmedValue);
      } catch (searchError) {
        console.error('Error searching player:', searchError);
        setError('Unable to search right now. Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const normalizedValue = trimmedValue.toLowerCase();

    if (!normalizedValue) {
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const playerExists = await playerExistsInSnapshots(normalizedValue);

      if (playerExists) {
        router.push(`/stats/${normalizedValue}`);
      } else {
        setError(`Player "${normalizedValue}" not found.`);
      }
    } catch (lookupError) {
      console.error('Error checking player:', lookupError);
      setError('Unable to search right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className ?? 'w-full'}>
      <Field>
        <ButtonGroup className="h-10 w-full">
          <div className="relative flex-1">
            <Input
              id={inputId}
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => {
                updateInputValue(e.target.value);
                if (error) setError('');
              }}
              disabled={disabled || isLoading}
              aria-invalid={Boolean(error)}
              className="rounded-r-none bg-background pr-9 autofill:bg-background"
            />
            {inputValue && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Clear player search"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                disabled={disabled || isLoading}
                onPointerDown={(event) => {
                  event.preventDefault();
                  clearPointerHandledRef.current = true;
                  handleClear();
                }}
                onClick={() => {
                  if (clearPointerHandledRef.current) {
                    clearPointerHandledRef.current = false;
                    return;
                  }
                  handleClear();
                }}
              >
                <X />
              </Button>
            )}
          </div>
          <Button type="submit" variant="outline" className="h-full px-3" disabled={disabled || isLoading}>
            <Search data-icon="inline-start" />
            {isLoading ? 'Searching...' : buttonLabel}
          </Button>
        </ButtonGroup>
        <FieldError>{error}</FieldError>
      </Field>
    </form>
  );
}
