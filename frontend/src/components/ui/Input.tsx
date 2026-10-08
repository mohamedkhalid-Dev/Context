type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: React.ReactNode;
  endAdornment?: React.ReactNode;
};

export default function Input({ label, icon, endAdornment, id, className, ...rest }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-black">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{icon}</span>
        )}
        <input
          id={inputId}
          className={`min-h-[48px] w-full touch-manipulation rounded-md border border-gray-200 bg-white px-3 py-2 text-base text-black outline-none placeholder:text-neutral-400 focus:border-black ${icon ? 'pl-9' : ''} ${endAdornment ? 'pr-12' : ''} ${className ?? ''}`}
          {...rest}
        />
        {endAdornment && (
          <span className="absolute right-1 top-1/2 -translate-y-1/2">{endAdornment}</span>
        )}
      </div>
    </div>
  );
}
