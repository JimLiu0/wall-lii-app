import Link from 'next/link';
import Image from 'next/image';

export default function NavBar() {
  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="container mx-auto px-4 py-2 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 w-fit hover:opacity-80 transition-opacity">
          <Image
            src="/android-chrome-512x512.png"
            alt="Wall-lii Logo"
            width={64}
            height={64}
            className="rounded-lg"
            priority
          />
          <span className="text-2xl font-bold text-white">Wall-lii</span>
        </Link>

        <div className="flex items-center gap-3">
          <a
            href="https://patreon.com/wall_lii"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-[#FF424D] text-white rounded-lg hover:bg-[#FF424D]/90 transition-colors"
            aria-label="Support on Patreon"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.21-3.22-7.21-7.18 0-3.97 3.24-7.21 7.21-7.21M2 21.6h3.5V2.41H2V21.6z"/>
            </svg>
          </a>

          <a
            href="https://www.paypal.com/donate/?hosted_button_id=TBGLAGYRPHLEY"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-[#0070BA] text-white rounded-lg hover:bg-[#0070BA]/90 transition-colors"
            aria-label="Donate with PayPal"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72c.162-.717.79-1.22 1.519-1.22h7.014c3.653 0 6.16 2.516 5.946 5.98-.242 3.946-3.256 6.143-6.82 6.143h-2.652l-1.098 5.985a.64.64 0 0 1-.633.729H7.076zm6.224-16.23h-5.34l-2.35 13.515h1.543l.96-5.24a.64.64 0 0 1 .63-.528h1.616c2.766 0 5.126-1.678 5.312-4.734.168-2.765-1.901-3.014-2.37-3.014z"/>
            </svg>
          </a>
        </div>
      </div>
    </nav>
  );
} 