import { createContext, useContext } from 'react';

export const ChineseStreamerContext = createContext<Record<string, string>>({});

export const useChineseStreamers = () => useContext(ChineseStreamerContext);