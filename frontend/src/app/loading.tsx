// Root loading skeleton: reserves hero layout to reduce CLS/LCP shift.
// Monochrome only, no remote assets, lightweight animate-pulse.
export default function RootLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl bg-white px-4 text-black"
      aria-busy="true"
      aria-label="Loading page"
      style={{ contentVisibility: 'auto' }}
    >
      <div className="py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto h-6 w-40 animate-pulse rounded-full bg-neutral-200" />
          <div className="mx-auto mt-4 aspect-[16/6] w-full max-w-xl animate-pulse rounded-lg bg-neutral-100" />
          <div className="mx-auto mt-4 h-4 w-3/4 animate-pulse rounded bg-neutral-100" />
          <div className="mx-auto mt-6 flex max-w-md justify-center gap-3">
            <div className="h-10 w-32 animate-pulse rounded-md bg-neutral-200" />
            <div className="h-10 w-32 animate-pulse rounded-md bg-neutral-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
