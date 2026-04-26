export function transformLinks(
  html: string,
  currentFilePath: string,
  filePathToChapterIndex: Map<string, number>
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const links = doc.querySelectorAll('a[href]');

  for (const link of links) {
    const href = link.getAttribute('href') || '';

    // Skip already processed links
    if (link.hasAttribute('data-transformed')) continue;

    // External links
    if (href.startsWith('http://') || href.startsWith('https://')) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener');
      link.classList.add('external-link');
      link.setAttribute('data-transformed', 'true');
      continue;
    }

    // Parse the href
    const { fileName, fragment } = parseHref(href);

    // Resolve file path relative to current file
    const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/') + 1);
    const targetFilePath = fileName
      ? normalizePath(currentDir + fileName)
      : currentFilePath;

    // Look up chapter index
    const chapterIndex = filePathToChapterIndex.get(targetFilePath);

    if (chapterIndex !== undefined) {
      // Valid internal link
      link.setAttribute('data-chapter', chapterIndex.toString());
      if (fragment) {
        link.setAttribute('data-fragment', fragment);
      }
      link.classList.add('internal-link');
      link.setAttribute('href', 'javascript:void(0)');
      link.setAttribute('role', 'link');
    } else {
      // Missing file
      link.setAttribute('data-missing', 'true');
      link.setAttribute('data-original-href', href);
      link.classList.add('missing-link');
      link.setAttribute('href', 'javascript:void(0)');
    }

    link.setAttribute('data-transformed', 'true');
  }

  // Serialize back to string - get innerHTML of body to avoid extra body/html tags
  return doc.body.innerHTML;
}

function parseHref(href: string): { fileName: string | null; fragment: string | null } {
  const hashIndex = href.indexOf('#');

  if (hashIndex === -1) {
    return { fileName: href || null, fragment: null };
  }

  if (hashIndex === 0) {
    // Fragment-only link
    return { fileName: null, fragment: href.substring(1) };
  }

  // File with fragment
  return {
    fileName: href.substring(0, hashIndex),
    fragment: href.substring(hashIndex + 1)
  };
}

function normalizePath(path: string): string {
  const parts = path.split('/');
  const result: string[] = [];

  for (const part of parts) {
    if (part === '..') {
      if (result.length > 0 && result[result.length - 1] !== '..') {
        result.pop();
      } else {
        result.push(part);
      }
    } else if (part !== '.' && part !== '') {
      result.push(part);
    }
  }

  return result.join('/');
}
