/**
 * SSR Content Injection via Cloudflare HTMLRewriter
 * Replaces content of elements marked with data-cms attributes
 */

/**
 * Handles elements with data-cms="key" — replaces inner HTML
 */
class CmsTextHandler {
  constructor(content) {
    this.content = content;
    this.currentKey = null;
  }

  element(element) {
    const key = element.getAttribute('data-cms');
    if (key && this.content[key] !== undefined) {
      element.setInnerContent(this.content[key], { html: true });
    }
  }
}

/**
 * Handles elements with data-cms-href="key" — replaces href attribute
 */
class CmsLinkHandler {
  constructor(content) {
    this.content = content;
  }

  element(element) {
    const key = element.getAttribute('data-cms-href');
    if (key && this.content[key] !== undefined) {
      element.setAttribute('href', this.content[key]);
    }
  }
}

/**
 * Handles elements with data-cms-src="key" — replaces src attribute
 */
class CmsImageHandler {
  constructor(content) {
    this.content = content;
  }

  element(element) {
    const key = element.getAttribute('data-cms-src');
    if (key && this.content[key] !== undefined) {
      element.setAttribute('src', this.content[key]);
    }
    // Also handle alt text
    const altKey = element.getAttribute('data-cms-alt');
    if (altKey && this.content[altKey] !== undefined) {
      element.setAttribute('alt', this.content[altKey]);
    }
  }
}

/**
 * Handles <meta> tags with data-cms-content="key" — replaces content attribute
 */
class CmsMetaHandler {
  constructor(content) {
    this.content = content;
  }

  element(element) {
    const key = element.getAttribute('data-cms-content');
    if (key && this.content[key] !== undefined) {
      element.setAttribute('content', this.content[key]);
    }
  }
}

/**
 * Map URL pathname to a page ID
 */
function getPageId(pathname) {
  // Remove trailing slash and .html
  let pageId = pathname.replace(/^\//, '').replace(/\.html$/, '').replace(/\/$/, '');

  // Root path = index
  if (pageId === '' || pageId === 'index') return 'index';

  return pageId;
}

/**
 * Main SSR function: intercepts HTML responses and injects KV content
 */
export async function injectContent(request, response, env) {
  const url = new URL(request.url);
  const pageId = getPageId(url.pathname);

  // Parallel KV reads for page content and shared content
  const [pageContent, sharedContent] = await Promise.all([
    env.CMS_KV.get(`content:${pageId}`, 'json'),
    env.CMS_KV.get('content:_shared', 'json'),
  ]);

  // If no CMS content exists, return original HTML unchanged
  if (!pageContent && !sharedContent) {
    return response;
  }

  // Merge page-specific and shared content (page takes precedence)
  const content = { ...(sharedContent || {}), ...(pageContent || {}) };

  // Apply HTMLRewriter transformations
  return new HTMLRewriter()
    .on('[data-cms]', new CmsTextHandler(content))
    .on('[data-cms-href]', new CmsLinkHandler(content))
    .on('[data-cms-src]', new CmsImageHandler(content))
    .on('[data-cms-alt]', new CmsImageHandler(content))
    .on('[data-cms-content]', new CmsMetaHandler(content))
    .transform(response);
}
