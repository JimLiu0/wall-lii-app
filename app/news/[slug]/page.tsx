import { supabase } from '@/utils/supabaseClient';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';

export const revalidate = 3600; // Revalidate every hour

async function getNewsPost(slug: string) {
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
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getNewsPost(params.slug);
  
  if (!post) {
    return {
      title: 'Post Not Found'
    };
  }

  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      images: post.image_url ? [post.image_url] : [],
    },
  };
}

export default async function NewsPostPage({ params }: { params: { slug: string } }) {
  const post = await getNewsPost(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Link 
          href="/news" 
          className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-8 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to News
        </Link>

        <article className="max-w-4xl mx-auto bg-gray-900 rounded-xl overflow-hidden shadow-xl">
          {/* Hero Image */}
          {post.image_url && (
            <div className="relative w-full h-[400px]">
              <Image
                src={post.image_url}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className="p-8">
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-6">
              <span className="bg-gray-800 px-3 py-1 rounded-full">
                {new Date(post.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <span className="bg-gray-800 px-3 py-1 rounded-full">
                By {post.author}
              </span>
              {post.type && (
                <span className="bg-blue-900 text-blue-200 px-3 py-1 rounded-full">
                  {post.type}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Summary */}
            {post.summary && (
              <div className="text-xl text-gray-300 mb-8 font-medium leading-relaxed">
                {post.summary}
              </div>
            )}

            {/* Source */}
            <div className="text-xl text-gray-300 mb-8 font-medium leading-relaxed">
              <a className="text-blue-400 hover:text-blue-300" href={post.source} target="_blank" rel="noopener noreferrer">Original Source</a>
            </div>

            {/* Content */}
            <div className="prose prose-lg prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>

            {/* Footer metadata */}
            <div className="mt-12 pt-6 border-t border-gray-800 text-sm text-gray-400">
              Last updated: {new Date(post.updated_at || post.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}