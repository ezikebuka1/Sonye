import type { Metadata } from 'next';
import { PolicyDoc } from '@/components/PolicyDoc';
import { readPolicyContent } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Privacy Policy · Sonye',
  description: 'How Sonye handles your information.',
};

// Public — no auth gate. Carriers and the Twilio reviewer read this without
// logging in. There is no middleware, so the route is reachable unauthenticated.
export default async function PrivacyPage() {
  const markdown = await readPolicyContent('privacy');
  return <PolicyDoc markdown={markdown} />;
}
