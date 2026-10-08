'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'About', href: '/about' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white pt-safe">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-h-[44px] items-center gap-2"
          aria-label="Context home"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/logo.svg"
            alt="Context logo"
            width={32}
            height={32}
            sizes="32px"
            className="h-8 w-8 rounded-md"
            priority
          />
          <span className="font-display text-lg font-bold">Context</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="inline-flex min-h-[44px] items-center text-sm text-gray-500 hover:text-black"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden min-h-[44px] items-center text-sm text-gray-500 hover:text-black sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-900"
          >
            Start Free <ArrowRight size={16} aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-gray-200 text-black transition hover:bg-gray-50 md:hidden"
          >
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="border-t border-gray-100 bg-white md:hidden"
        >
          <ul className="mx-auto max-w-6xl space-y-1 px-4 py-3 sm:px-6">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[44px] items-center rounded-md px-2 text-base text-black transition hover:bg-gray-50"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-1 sm:hidden">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center rounded-md px-2 text-base text-gray-500 hover:text-black"
              >
                Log in
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
