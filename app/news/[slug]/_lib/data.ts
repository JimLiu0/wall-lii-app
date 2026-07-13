import { cache } from 'react';
import { unstable_cache } from 'next/cache';

import { supabase } from '@/utils/supabaseClient';

export interface NewsPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary?: string;
  image_url?: string;
  author: string;
  created_at: string;
  updated_at?: string;
  type?: string;
  source?: string;
}

export interface BattlegroundsEntity {
  entity_name: string;
  image_url: string;
}

const getPersistedNewsPost = unstable_cache(
  async (slug: string): Promise<NewsPost | null> => {
    const { data, error } = await supabase
      .from('news_posts')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error || !data) {
      console.error('Error fetching news post:', error);
      return null;
    }

    return data;
  },
  ['news-post'],
  { revalidate: 60 * 60 },
);

// Metadata and page rendering request the same post during one render.
export const getNewsPost = cache(getPersistedNewsPost);

export const getBattlegroundsEntities = unstable_cache(
  async (): Promise<BattlegroundsEntity[]> => {
    const chunkSize = 1000;
    const allEntities: BattlegroundsEntity[] = [];

    for (let from = 0; ; from += chunkSize) {
      const { data, error } = await supabase
        .from('bg_entities')
        .select('entity_name, image_url')
        .range(from, from + chunkSize - 1);

      if (error) {
        console.error('Error fetching bg_entities:', error);
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      allEntities.push(...data);

      if (data.length < chunkSize) {
        break;
      }
    }

    return allEntities;
  },
  ['battlegrounds-entities'],
  { revalidate: 24 * 60 * 60 },
);
