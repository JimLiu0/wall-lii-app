import { supabase } from '@/utils/supabaseClient';
import { Newspaper } from 'lucide-react';
import { Banner } from '@/components/ui/banner';

interface NewsPost {
  id: number;
  title: string;
  slug: string;
  summary: string;
  image_url: string;
  author: string;
  created_at: string;
}

async function getLatestNewsPost(): Promise<NewsPost | null> {
  const { data, error } = await supabase
    .from('news_posts')
    .select('id, title, slug, summary, image_url, author, created_at')
    .eq('is_published', true)
    .eq('battlegrounds_relevant', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching latest news post:', error);
    return null;
  }

  return data;
}

export default async function NewsBanner() {
  const latestPost = await getLatestNewsPost();

  if (!latestPost) {
    return null;
  }

  // Check if the news post is less than 1 week old
  const postDate = new Date(latestPost.created_at);
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  if (postDate < oneWeekAgo) {
    return null;
  }

  return (
    <Banner
      variant="accent"
      href={`/news/${latestPost.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      icon={<Newspaper className="h-4 w-4 text-primary" />}
      title={latestPost.title}
    >
      <span className="mr-2 inline-block text-xs text-muted-foreground">
        {new Date(latestPost.created_at).toLocaleDateString()}
      </span>
      <span className="hidden sm:inline text-sm text-muted-foreground">
        {latestPost.summary}
      </span>
    </Banner>
  );
} 