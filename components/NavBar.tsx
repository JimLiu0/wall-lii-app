import Link from 'next/link';
import Image from 'next/image';

export default function NavBar() {
  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="container mx-auto pl-2 py-2">
        <Link href="/" className="flex items-center gap-3 w-fit hover:opacity-80 transition-opacity">
          <Image
            src="/logo.png"
            alt="Wall-lii Logo"
            width={64}
            height={64}
            className="rounded-lg"
            priority
          />
          <span className="text-2xl font-bold text-white">Wall-lii</span>
        </Link>
      </div>
    </nav>
  );
} 