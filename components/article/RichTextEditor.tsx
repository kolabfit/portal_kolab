import React, { forwardRef, memo, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { sanitizeArticleHtml } from '../../lib/articleHtml';

type Props = { initialValue: string; disabled: boolean; onChange: (html: string) => void };

const RichTextEditor = memo(forwardRef<HTMLDivElement, Props>(({ initialValue, disabled, onChange }, forwardedRef) => {
  const root = useRef<HTMLDivElement>(null);
  const initial = useRef(initialValue);
  const range = useRef<Range | null>(null);
  useImperativeHandle(forwardedRef, () => root.current!, []);
  // React never owns the editable children. Initialize once per modal opening.
  useLayoutEffect(() => { if (root.current) root.current.innerHTML = sanitizeArticleHtml(initial.current); }, []);

  const rememberSelection = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && root.current?.contains(selection.anchorNode) && root.current.contains(selection.focusNode)) {
      range.current = selection.getRangeAt(0).cloneRange();
    }
  };
  useEffect(() => {
    document.addEventListener('selectionchange', rememberSelection);
    return () => document.removeEventListener('selectionchange', rememberSelection);
  }, []);

  const restoreSelection = () => {
    const editor = root.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (!selection) return;
    let saved = range.current;
    if (!saved || !editor.contains(saved.startContainer) || !editor.contains(saved.endContainer)) {
      saved = document.createRange(); saved.selectNodeContents(editor); saved.collapse(false);
    }
    selection.removeAllRanges(); selection.addRange(saved);
  };
  const command = (name: string, value = '') => {
    if (disabled) return;
    restoreSelection();
    document.execCommand(name, false, value);
    rememberSelection();
    onChange(root.current?.innerHTML || '');
  };
  const actions = [
    ['Bold', 'B', 'bold', ''], ['Italic', 'I', 'italic', ''],
    ['Heading 2', 'H2', 'formatBlock', 'H2'], ['Heading 3', 'H3', 'formatBlock', 'H3'],
    ['Bullet List', '•', 'insertUnorderedList', ''], ['Numbered List', '1.', 'insertOrderedList', ''],
  ];

  return <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white focus-within:ring-2 focus-within:ring-yellow-200">
    <div role="toolbar" aria-label="Format artikel" className="bg-slate-50 p-2 border-b border-slate-200 flex flex-wrap gap-1">
      {actions.map(([label, text, name, value]) => <button key={label} type="button" aria-label={label} disabled={disabled}
        onMouseDown={event => event.preventDefault()} onClick={() => command(name, value)}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-200 font-bold disabled:opacity-50">{text}</button>)}
    </div>
    <div ref={root} role="textbox" aria-label="Isi Artikel" aria-multiline="true" aria-disabled={disabled}
      contentEditable={!disabled} suppressContentEditableWarning
      onInput={() => { rememberSelection(); onChange(root.current?.innerHTML || ''); }}
      onBlur={rememberSelection} onKeyUp={rememberSelection} onMouseUp={rememberSelection}
      onPaste={event => {
        event.preventDefault();
        if (disabled) return;
        rememberSelection();
        const html = event.clipboardData.getData('text/html');
        const text = event.clipboardData.getData('text/plain');
        const escaped = document.createElement('div'); escaped.textContent = text;
        command('insertHTML', sanitizeArticleHtml(html || escaped.innerHTML.replace(/\r?\n/g, '<br>')));
      }}
      className="p-6 min-h-[260px] max-h-[420px] overflow-y-auto outline-none bg-white text-slate-800 text-base leading-relaxed article-editor-content empty:before:content-['Tulis_isi_artikel_di_sini...'] empty:before:text-slate-400 empty:before:pointer-events-none" />
  </div>;
}));

export default RichTextEditor;
