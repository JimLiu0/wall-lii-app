import { useEffect, useRef, useState } from 'react';
import { fetchProfileHistory, historyKey, type HistorySelection } from '../_lib/history';
import type { PlayerData, SnapshotPoint } from '../_lib/data';

const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHED_PERIODS = 6;

export function useProfileHistory(playerData: PlayerData, selection: HistorySelection) {
  const key = historyKey(selection);
  const initialKey = historyKey(playerData.initialSelection);
  const cache = useRef(new Map<string, { data: SnapshotPoint[]; fetchedAt: number }>([
    [initialKey, { data: playerData.data, fetchedAt: Date.now() }],
  ]));
  const [result, setResult] = useState({ key: initialKey, data: playerData.data, error: null as string | null });
  const [attempt, setAttempt] = useState(0);
  const { region, mode, view, date } = selection;

  useEffect(() => {
    const cached = cache.current.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      setResult({ key, data: cached.data, error: null });
      return;
    }
    const controller = new AbortController();
    setResult({ key: '', data: [], error: null });
    fetchProfileHistory(playerData.playerId, playerData.name, { region, mode, view, date }, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return;
        cache.current.delete(key);
        cache.current.set(key, { data, fetchedAt: Date.now() });
        if (cache.current.size > MAX_CACHED_PERIODS) {
          cache.current.delete(cache.current.keys().next().value!);
        }
        setResult({ key, data, error: null });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({ key, data: [], error: 'Unable to load this period. Please try again.' });
        }
      });
    return () => controller.abort();
  }, [key, region, mode, view, date, playerData.playerId, playerData.name, attempt]);

  return {
    data: result.key === key ? result.data : [],
    isLoading: result.key !== key,
    error: result.key === key ? result.error : null,
    retry: () => setAttempt(value => value + 1),
  };
}
