import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline, Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code, Link2, Image as ImageIcon, Minus, Eye, Code2,
} from "lucide-react";

/**
 * Dependency-free rich text editor backed by a contentEditable surface and
 * execCommand. Emits HTML via onChange. Supports a "source" mode for raw HTML
 * (which also lets you paste Markdown-ish HTML). Good enough for blog articles
 * without pulling in a multi-megabyte editor library.
 */
export function RichEditor({ value, onChange, onUploadImage }: { value: string; onChange: (html: string) => void; onUploadImage?: (file: File) => Promise<string> }) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Sync incoming value when it changes externally (e.g. loading a post).
  useEffect(() => {
    if (ref.current && !source && ref.current.innerHTML !== value) ref.current.innerHTML = value || "";
  }, [value, source]);

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML || "");
  };
  const block = (tag: string) => exec("formatBlock", tag);

  const addLink = () => { const url = prompt("Link URL"); if (url) exec("createLink", url); };

  // Upload a file then insert it; falls back to URL prompt if no uploader given.
  const insertFile = async (file: File) => {
    if (!onUploadImage) { const url = prompt("Image URL"); if (url) exec("insertImage", url); return; }
    setUploading(true);
    try { const url = await onUploadImage(file); exec("insertImage", url); }
    catch { /* surfaced by caller's toast */ } finally { setUploading(false); }
  };
  const addImage = () => { if (onUploadImage) fileRef.current?.click(); else { const url = prompt("Image URL"); if (url) exec("insertImage", url); } };
  const onDrop = (e: React.DragEvent) => {
    const img = Array.from(e.dataTransfer.files).find(f => f.type.startsWith("image/"));
    if (img) { e.preventDefault(); insertFile(img); }
  };

  const Btn = ({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) => (
    <button type="button" title={title} onMouseDown={e => e.preventDefault()} onClick={onClick}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100">{children}</button>
  );

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50">
        <Btn title="Heading 1" onClick={() => block("h1")}><Heading1 className="w-4 h-4" /></Btn>
        <Btn title="Heading 2" onClick={() => block("h2")}><Heading2 className="w-4 h-4" /></Btn>
        <Btn title="Heading 3" onClick={() => block("h3")}><Heading3 className="w-4 h-4" /></Btn>
        <span className="w-px h-5 bg-slate-200 mx-1" />
        <Btn title="Bold" onClick={() => exec("bold")}><Bold className="w-4 h-4" /></Btn>
        <Btn title="Italic" onClick={() => exec("italic")}><Italic className="w-4 h-4" /></Btn>
        <Btn title="Underline" onClick={() => exec("underline")}><Underline className="w-4 h-4" /></Btn>
        <span className="w-px h-5 bg-slate-200 mx-1" />
        <Btn title="Bulleted list" onClick={() => exec("insertUnorderedList")}><List className="w-4 h-4" /></Btn>
        <Btn title="Numbered list" onClick={() => exec("insertOrderedList")}><ListOrdered className="w-4 h-4" /></Btn>
        <Btn title="Quote" onClick={() => block("blockquote")}><Quote className="w-4 h-4" /></Btn>
        <Btn title="Code block" onClick={() => block("pre")}><Code className="w-4 h-4" /></Btn>
        <Btn title="Divider" onClick={() => exec("insertHorizontalRule")}><Minus className="w-4 h-4" /></Btn>
        <span className="w-px h-5 bg-slate-200 mx-1" />
        <Btn title="Link" onClick={addLink}><Link2 className="w-4 h-4" /></Btn>
        <Btn title="Upload image" onClick={addImage}><ImageIcon className="w-4 h-4" /></Btn>
        {uploading && <span className="text-[11px] text-slate-400 font-bold ml-1">Uploading…</span>}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) insertFile(f); e.target.value = ""; }} />
        <div className="ml-auto">
          <Btn title={source ? "Visual editor" : "HTML source"} onClick={() => setSource(s => !s)}>
            {source ? <Eye className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
          </Btn>
        </div>
      </div>

      {source ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full h-80 p-4 font-mono text-xs focus:outline-none resize-y"
          placeholder="<p>Raw HTML…</p>"
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          onInput={e => onChange((e.target as HTMLDivElement).innerHTML)}
          onDrop={onDrop}
          onDragOver={e => onUploadImage && e.preventDefault()}
          className="blog-content min-h-[320px] max-h-[640px] overflow-y-auto p-4 focus:outline-none prose prose-slate max-w-none"
          suppressContentEditableWarning
        />
      )}
    </div>
  );
}
