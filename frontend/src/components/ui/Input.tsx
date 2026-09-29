type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: React.ReactNode;
};

export default function Input({ label, icon, id, ...rest }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-black">
        {label}
      </label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</span>}
        <input
          id={inputId}
          className={`w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black ${icon ? 'pl-9' : ''}`}
          {...rest}
        />
      </div>
    </div>
  );
}
