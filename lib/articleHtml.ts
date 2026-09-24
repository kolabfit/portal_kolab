import DOMPurify from 'dompurify';

export function sanitizeArticleHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote'],
    ALLOWED_ATTR: ['href', 'title'],
  });
}

export function isRichTextEmpty(html: string) {
  const parsed = new DOMParser().parseFromString(sanitizeArticleHtml(html), 'text/html');
  return !(parsed.body.textContent || '').replace(/[\s\u200b-\u200d\ufeff]/g, '');
}
