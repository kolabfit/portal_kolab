import React from 'react';
import { createRoot } from 'react-dom/client';
import ArticleView from '../../views/ArticleView';
import { api } from '../../api';

declare global { interface Window { articlePayload: any; completeSave: (success: boolean) => void; } }
const editing = new URLSearchParams(location.search).has('edit');
createRoot(document.getElementById('root')!).render(<ArticleView
  articles={editing ? [{ id: 'edit-1', title: 'Existing article', author: 'Student', date: '2026-09-23', categoryId: 'cat1', tags: [], content: '<h2>Saved heading</h2><p>Original description</p><ul><li>Saved bullet</li></ul>' }] : []}
  categories={[{ id: 'cat1', name: 'Category one' }, { id: 'cat2', name: 'Category two' }]}
  tags={[{ id: 'tag1', name: 'Test tag' }]} isAdmin={false} currentUser="Student"
  showConfirm={() => {}}
  onAction={async (_type, id, data) => {
    window.articlePayload = { id, ...data };
    if (new URLSearchParams(location.search).has('api')) {
      const response = await api.postData('manageArticle', { type: _type, id, data });
      return response?.status === 'success' && response.id === id;
    }
    return new Promise<boolean>(resolve => { window.completeSave = resolve; });
  }}
/>);
