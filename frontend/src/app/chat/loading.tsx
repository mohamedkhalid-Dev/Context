export default function ChatLoading() {
  return (
    <div className="flex h-[100dvh] bg-white text-black" aria-busy="true" aria-label="Loading chat">
      <div className="hidden w-64 shrink-0 space-y-2 border-r border-neutral-200 p-4 lg:block">
        <div className="h-8 animate-pulse rounded-md bg-neutral-200" />
        <div className="h-10 animate-pulse rounded-md bg-neutral-100" />
        <div className="h-10 animate-pulse rounded-md bg-neutral-100" />
        <div className="h-10 animate-pulse rounded-md bg-neutral-100" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-neutral-200 px-4 py-3">
          <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />
          <div className="mt-2 h-3 w-64 animate-pulse rounded bg-neutral-100" />
        </div>
        <div className="flex-1 space-y-3 bg-neutral-50 px-4 py-4">
          <div className="h-12 w-3/4 animate-pulse rounded-lg bg-neutral-200" />
          <div className="ml-auto h-10 w-1/2 animate-pulse rounded-lg bg-neutral-200" />
          <div className="h-16 w-2/3 animate-pulse rounded-lg bg-neutral-200" />
        </div>
        <div className="border-t border-neutral-200 p-3">
          <div className="h-10 animate-pulse rounded-md bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}
