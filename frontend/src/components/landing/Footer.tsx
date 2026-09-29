import Link from 'next/link';
import Image from 'next/image';

const productLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'All features', href: '/features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'About', href: '/about' },
];

const legalLinks = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Login', href: '/login' },
];

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Context logo" width={32} height={32} className="h-8 w-8 rounded-md" />
            <span className="font-display text-lg font-bold text-black">Context</span>
          </Link>
          <p className="mt-3 text-sm text-gray-500">
            AI that asks before it answers. Bring your own OpenRouter key. Your key, your
            control.
          </p>
        </div>
        <nav aria-label="Product">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Product
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {productLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-gray-600 hover:text-black">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Legal</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {legalLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="text-gray-600 hover:text-black">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-gray-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-gray-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Context. Black & white by design.</p>
          <p>Bring your own OpenRouter key. Your key, your control.</p>
        </div>
      </div>
    </footer>
  );
}
