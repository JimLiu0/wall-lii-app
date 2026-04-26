'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { playerExistsInSnapshots } from '@/utils/playerUtils';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export default function PlayerSearch() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedValue = inputValue.trim().toLowerCase();

    if (!trimmedValue) {
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const playerExists = await playerExistsInSnapshots(trimmedValue);

      if (playerExists) {
        router.push(`/stats/${trimmedValue}`);
      } else {
        setError(`Player "${trimmedValue}" not found.`);
      }
    } catch (lookupError) {
      console.error('Error checking player:', lookupError);
      setError('Unable to search right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <Field>
        <ButtonGroup className="h-10 w-full">
          <Input
            id="player-search"
            placeholder="Search for a player..."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (error) setError('');
            }}
            disabled={isLoading}
            aria-invalid={Boolean(error)}
          />
          <Button type="submit" variant="outline" className="h-full px-3" disabled={isLoading}>
            <Search />
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </ButtonGroup>
        <FieldError>{error}</FieldError>
      </Field>
    </form>
  );
}
