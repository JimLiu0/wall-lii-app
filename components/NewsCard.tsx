import Link from 'next/link';
import Image from 'next/image';

interface NewsCardProps {
  title: string;
  slug: string;
  summary: string;
  imageUrl: string;
  author: string;
  createdAt: string;
}

export default function NewsCard({ title, slug, summary, imageUrl, author, createdAt }: NewsCardProps) {
  return (
    <Link href={`/news/${slug}`} target="_blank" className="block">
      <div className="bg-gray-900 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="relative h-48 w-full">
          <Image
            src={imageUrl ? imageUrl : "https://ds3fp1mnrtl6k.cloudfront.net/en/blizzard/original/1X/d8fc4a8875201123a20f9431a4f3bbe3aa378c3f.png"}
            alt={title}
            fill
            className="object-cover"
          />
        </div>
        <div className="p-4">
          <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
          <p className="text-gray-400 mb-4 line-clamp-2">{summary}</p>
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>{author}</span>
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </Link>
  );
} 