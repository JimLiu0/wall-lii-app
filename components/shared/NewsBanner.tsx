import { supabase } from '@/utils/supabaseClient';
import { Newspaper } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    <Alert
      variant="info"
      href={`/news/${latestPost.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-left"
    >
      <AlertTitle className="justify-start">
        <Newspaper className="h-4 w-4 text-primary" />
        <span className="mr-2 text-xs text-muted-foreground">
          {new Date(latestPost.created_at).toLocaleDateString()}
        </span>
        {latestPost.title}
      </AlertTitle>
      <AlertDescription className="text-muted-foreground">
        <span className="hidden sm:inline text-sm">
          {latestPost.summary}
        </span>
      </AlertDescription>
    </Alert>
  );
} 