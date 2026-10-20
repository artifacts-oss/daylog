// Builds a public share proxy URL for a stored file reference.
export function getSharedFileUrl(
  originalPath: string,
  token: string,
): string {
  if (
    originalPath.startsWith('http') ||
    originalPath.startsWith('data:') ||
    originalPath.startsWith('/api/v1/share/')
  ) {
    return originalPath;
  }
  // Ensure path is absolute for our proxy
  const path = originalPath.startsWith('/')
    ? originalPath
    : `/${originalPath}`;
  return `/api/v1/share/${token}/image${path}`;
}

// Rewrites internal image/attachment references in markdown so they can be
// fetched through the public share proxy without authentication.
export function processSharedMarkdown(
  content: string,
  token: string,
): string {
  if (!content) return '';
  return content.replace(/(!?)\[([^[\]]*)\]\(([^()]*)\)/g, (match, prefix, label, url) => {
    let rewritten = url;

    if (url.includes('/api/v1/images?filePath=')) {
      const filePath = url.split('filePath=')[1];
      rewritten = getSharedFileUrl(decodeURIComponent(filePath), token);
    } else if (url.includes('/api/v1/storage?key=')) {
      const key = url.split('key=')[1];
      rewritten = getSharedFileUrl(decodeURIComponent(key), token);
    } else if (prefix === '!' && url.startsWith('/')) {
      // Legacy/plain-path images
      rewritten = getSharedFileUrl(url, token);
    }

    return rewritten === url
      ? match
      : `${prefix}[${label}](${rewritten})`;
  });
}