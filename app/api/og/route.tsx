import { ImageResponse } from 'next/og';
import { supabase } from '@/utils/supabaseClient';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontSize: 48,
              fontWeight: 'bold',
            }}
          >
            <div>Wallii Hearthstone Battlegrounds News</div>
            <div style={{ fontSize: 24, marginTop: 16, color: '#94a3b8' }}>
              Post Not Found
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
          headers: {
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
          },
        }
      );
    }

    // Fetch the news post from Supabase
    const { data: post, error } = await supabase
      .from('news_posts')
      .select('title, summary, type')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error || !post) {
      return new ImageResponse(
        (
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              fontSize: 48,
              fontWeight: 'bold',
            }}
          >
            <div>Wallii Hearthstone Battlegrounds News</div>
            <div style={{ fontSize: 24, marginTop: 16, color: '#94a3b8' }}>
              Post Not Found
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
          headers: {
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
          },
        }
      );
    }

    // Truncate title and summary for display
    const truncateText = (text: string, maxLength: number) => {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength).trim() + '...';
    };

    const title = truncateText(post.title, 60);
    const summary = truncateText(post.summary || '', 180);

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '60px',
            position: 'relative',
          }}
        >
          {/* Background gradient */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            }}
          />

          {/* Logo/Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#3b82f6',
                marginRight: '12px',
              }}
            >
              🤖
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#ffffff',
              }}
            >
              Wallii Hearthstone Battlegrounds News
            </div>
          </div>



          {/* Title */}
          <div
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              lineHeight: '1.1',
              marginBottom: '32px',
              color: '#ffffff',
            }}
          >
            {title}
          </div>

          {/* Summary */}
          {summary && (
            <div
              style={{
                fontSize: '28px',
                lineHeight: '1.4',
                color: '#94a3b8',
                maxWidth: '1000px',
              }}
            >
              {summary}
            </div>
          )}

          {/* Bottom accent */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '8px',
              background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
            }}
          />
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (e) {
    console.log(`${e instanceof Error ? e.message : 'Unknown error'}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
} 