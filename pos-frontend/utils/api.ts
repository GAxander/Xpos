export const getApiUrl = (path: string): string => {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    console.warn('NEXT_PUBLIC_API_URL not defined');
    return path; // fallback to relative path for dev
  }
  // Ensure no double slashes
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/${normalizedPath}`;
};
