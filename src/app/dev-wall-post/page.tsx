import { notFound } from 'next/navigation';
import { postLobbyMessageAction } from '@/app/actions';

// DEV-ONLY harness (notFound() in prod, mirroring /dev-login). Invokes the wall
// post server action DIRECTLY so the ends_at + 2h necro-guard can be proven as a
// real server-side call — the production UI hides the composer on a closed slot,
// so the guard is otherwise unreachable from the browser. Renders the raw
// PostMessageResult as JSON for the proof to assert against.
export const dynamic = 'force-dynamic';

export default async function DevWallPostPage({
  searchParams,
}: {
  searchParams: Promise<{ slotId?: string; body?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { slotId = '', body = '' } = await searchParams;
  const result = await postLobbyMessageAction(slotId, body);
  return (
    <pre data-testid="dev-wall-post-result" style={{ padding: '1rem', fontFamily: 'monospace' }}>
      {JSON.stringify(result)}
    </pre>
  );
}
