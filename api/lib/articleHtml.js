import sanitizeHtml from 'sanitize-html';

export function sanitizeArticleHtml(html) {
  return sanitizeHtml(typeof html === 'string' ? html : '', {
    allowedTags: ['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote'],
    allowedAttributes: { a: ['href', 'title'] },
    allowedSchemes: ['http', 'https', 'mailto'], allowProtocolRelative: false,
  });
}

export function validateArticleContent(content) {
  const clean = sanitizeArticleHtml(content);
  // Sanitizer decodes entities; its textFilter sees actual text, not markup.
  let text = '';
  sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {}, textFilter: value => { text += value; return value; } });
  if (!text.replace(/&nbsp;|&#160;|&#xA0;|[\s\u200b-\u200d\ufeff]/gi, '')) {
    throw Object.assign(new Error('Isi artikel wajib diisi.'), { status: 400, error: 'VALIDATION_ERROR', field: 'content' });
  }
  return clean;
}
