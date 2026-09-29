import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'About', href: '/about' },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Context home">
          <Image
            src="/logo.svg"
            alt="Context logo"
            width={32}
            height={32}
            className="h-8 w-8 rounded-md"
            priority
          />
          <span className="font-display text-lg font-bold">Context</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} className="text-sm text-gray-500 hover:text-black">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm text-gray-500 hover:text-black sm:block">
            Log in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-900"
          >
            Start Free <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </div>
      <nav aria-label="Mobile" className="border-t border-gray-100 md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-4 py-2.5">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="whitespace-nowrap text-sm text-gray-500 hover:text-black"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
