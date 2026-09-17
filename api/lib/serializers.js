export function record(row) {
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    result[key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
  }
  if ('tags' in row) {
    try { result.tags = JSON.parse(row.tags || '[]'); }
    catch { result.tags = (row.tags || '').split(',').filter(Boolean); }
  }
  return result;
}

export function repoItem(row) {
  return { ...record(row), size: Number(row.size) || 0, mimeType: row.mime,
    parentId: row.parent_id || 'ROOT' };
}
