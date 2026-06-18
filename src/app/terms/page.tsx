import type { Metadata } from 'next';
import { PolicyDoc } from '@/components/PolicyDoc';
import { readPolicyContent } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Terms of Service · Sonye',
  description: 'The terms for using Sonye.',
};

// Public — no auth gate. Carriers and the Twilio reviewer read this without
// logging in. There is no middleware, so the route is reachable unauthenticated.
export default async function TermsPage() {
  const markdown = await readPolicyContent('terms');
  return <PolicyDoc markdown={markdown} />;
}
