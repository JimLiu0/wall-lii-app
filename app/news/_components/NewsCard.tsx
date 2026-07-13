import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

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
    <Link
      href={`/news/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-full"
    >
      <Card className="h-full transition-shadow duration-300 hover:shadow-lg">
        <CardContent>
          <div className="relative h-48 w-full overflow-hidden rounded-md">
            <Image
              src={imageUrl ? imageUrl : "https://ds3fp1mnrtl6k.cloudfront.net/en/blizzard/original/1X/d8fc4a8875201123a20f9431a4f3bbe3aa378c3f.png"}
              alt={title}
              fill
              className="object-cover"
            />
          </div>
        </CardContent>
        <CardHeader>
          <CardTitle>
            <h3>{title}</h3>
          </CardTitle>
          <CardDescription className="line-clamp-2">{summary}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-between text-sm text-muted-foreground">
          <span>{author}</span>
          <span>{new Date(createdAt).toLocaleDateString()}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}
