import { Suspense } from "react";
import HomeClient from "./HomeClient";

// Server component — reads searchParams for the onboarding demo toggle.
// In Next.js 15+, searchParams is a Promise and must be awaited.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ onboarded?: string }>;
}) {
  const params = await searchParams;
  return (
    <Suspense>
      <HomeClient onboardedOverride={params?.onboarded === "1"} />
    </Suspense>
  );
}
