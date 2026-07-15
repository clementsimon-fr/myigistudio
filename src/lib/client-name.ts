export function makeDisplayName(firstName: string, lastName: string): string {
  const fn = (firstName || "").trim();
  const ln = (lastName || "").trim();
  if (!fn && !ln) return "";
  if (!ln) return fn;
  return `${fn}.${ln.charAt(0).toUpperCase()}`;
}
