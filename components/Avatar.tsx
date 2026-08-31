export default function Avatar({
  url,
  size = 40,
  className = "",
}: {
  url: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Profile"
        style={style}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={style}
      className={`rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="text-neutral-400"
        style={{ width: size * 0.6, height: size * 0.6 }}
      >
        <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.4c-3.3 0-9.8 1.6-9.8 4.9v2.5h19.6v-2.5c0-3.3-6.5-4.9-9.8-4.9z" />
      </svg>
    </div>
  );
}
