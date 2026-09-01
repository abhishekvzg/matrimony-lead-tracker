function initials(name: string | null): string {
  if (!name) return "?";
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export default function Avatar({
  url,
  name = null,
  size = 40,
  className = "",
}: {
  url: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size, fontSize: size * 0.4 };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Profile"
        style={{ width: size, height: size }}
        className={`avatar-circle object-cover ${className}`}
      />
    );
  }

  return (
    <div style={style} className={`avatar-circle ${className}`}>
      {initials(name)}
    </div>
  );
}
