export default function OnboardingLoading() {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-white px-4 py-8"
      aria-busy="true"
      aria-label="Loading onboarding"
    >
      <div className="w-full max-w-md space-y-3">
        <div className="mx-auto h-6 w-48 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-neutral-100 mx-auto" />
        <div className="rounded-lg border border-neutral-200 p-4 sm:p-6">
          <div className="h-12 animate-pulse rounded-md bg-neutral-100" />
          <div className="mt-4 h-12 animate-pulse rounded-md bg-neutral-100" />
          <div className="mt-4 h-12 animate-pulse rounded-md bg-neutral-100" />
          <div className="mt-4 h-12 animate-pulse rounded-md bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}
