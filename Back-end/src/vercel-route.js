export function restoreApiRequestUrl(request) {
  const pathValue = request.query?.path;
  const pathParts = Array.isArray(pathValue) ? pathValue : [pathValue];
  const endpoint = pathParts.filter(Boolean).join("/").replace(/^\/+/, "");
  const segments = endpoint.split("/").filter(Boolean);

  if (!segments.length || segments.some((segment) => segment === "." || segment === "..")) {
    return false;
  }

  const originalUrl = new URL(request.url, "http://vercel.internal");
  originalUrl.searchParams.delete("path");
  request.url = `/api/${segments.join("/")}${originalUrl.searchParams.size ? `?${originalUrl.searchParams}` : ""}`;

  return true;
}
