export default function LoginLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-white px-4"
      aria-busy="true"
      aria-label="Loading login"
    >
      <div className="w-full max-w-md space-y-3">
        <div className="mx-auto h-6 w-48 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-neutral-100 mx-auto" />
        <div className="rounded-lg border border-neutral-200 p-6">
          <div className="h-10 animate-pulse rounded-md bg-neutral-100" />
          <div className="mt-4 h-10 animate-pulse rounded-md bg-neutral-100" />
          <div className="mt-4 h-10 animate-pulse rounded-md bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}
