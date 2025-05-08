import { supabase } from '@/utils/supabaseClient';
import NewsCard from '@/components/NewsCard';

export const revalidate = 300; // Revalidate every 5 minutes

async function getNewsPosts() {
  const { data, error } = await supabase
    .from('news_posts')
    .select('id, title, slug, summary, image_url, author, created_at')
    .eq('is_published', true)
    .eq('battlegrounds_relevant', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching news posts:', error);
    return [];
  }

  return data;
}

export const metadata = {
  title: 'Latest Battlegrounds News',
  description: 'Stay up to date with the latest news and updates for Hearthstone Battlegrounds',
  openGraph: {
    title: 'Latest Battlegrounds News',
    description: 'Stay up to date with the latest news and updates for Hearthstone Battlegrounds',
    images: [
      {
        url: '/og-image-news.jpg',
        width: 1200,
        height: 600,
      },
    ],
  },
};

export default async function NewsPage() {
  const newsPosts = await getNewsPosts();

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Latest News</h1>
        
        {newsPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsPosts.map((post) => (
              <NewsCard
                key={post.id}
                title={post.title}
                slug={post.slug}
                summary={post.summary}
                imageUrl={post.image_url}
                author={post.author}
                createdAt={post.created_at}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400">
            No news posts available at the moment.
          </div>
        )}
      </main>
    </div>
  );
} 