export default function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">{children}</div>
  );
}
