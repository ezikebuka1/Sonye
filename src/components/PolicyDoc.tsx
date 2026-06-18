import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Shared chrome for the public policy routes (/privacy, /terms).
 *
 * Renders markdown with D8.2 styling: ink-on-bg, Nunito body, Baloo 2
 * (font-serif) headings, Sonye wordmark header, comfortable reading width.
 * react-markdown builds a real element tree (no raw-HTML injection), and
 * the arbitrary descendant variants below style those elements — so the
 * real legal text drops into content/*.md with no change here.
 */
export function PolicyDoc({ markdown }: { markdown: string }) {
  return (
    <main className="min-h-screen bg-bg px-5 py-10">
      <div className="mx-auto w-full max-w-[640px]">
        <header className="mb-8">
          <Link href="/" className="font-serif text-2xl font-bold text-ink">
            Sonye
          </Link>
        </header>

        <article
          className="
            font-sans text-ink
            [&_h1]:mb-4 [&_h1]:font-serif [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-ink
            [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink
            [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink
            [&_p]:mb-4 [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-ink
            [&_a]:text-cta [&_a]:underline
            [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5
            [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5
            [&_li]:mb-1 [&_li]:text-[15px] [&_li]:text-ink
            [&_strong]:font-semibold [&_em]:italic
            [&_hr]:my-8 [&_hr]:border-border
            [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-steel
          "
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </article>
      </div>
    </main>
  );
}
