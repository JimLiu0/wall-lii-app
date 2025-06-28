import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';

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
    <div className="mb-6">
      <Link
        href={`/news/${latestPost.slug}`}
        target="_blank"
        className="block bg-gray-900 border border-gray-700 rounded-lg p-3 hover:bg-gray-800 transition-all duration-200 shadow-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-200 text-sm font-medium whitespace-nowrap">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Latest News</span>
              </div>
              <h2 className="text-white font-semibold text-base line-clamp-1 flex-1">
                {latestPost.title}
              </h2>
              <span className="text-gray-400 text-xs whitespace-nowrap">
                {new Date(latestPost.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-gray-400 text-sm hidden sm:block line-clamp-1 mt-1">
              {latestPost.summary}
            </p>
          </div>
          <div className="ml-3 flex-shrink-0">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </div>
      </Link>
    </div>
  );
} 