"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BubbleMenu, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/auth-context";

interface PostCanvasEditorProps {
  postId?: string;
}

function readingTimeFromHtml(html: string): number {
  const text = html.replace(/<[^>]*>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

const LEAD_EMBED = `<aside class="sito-callout sito-callout-lead" data-sito-embed="lead-magnet"><p><strong>Lead magnet</strong></p><p>Readers will see your free guide signup in the article footer — keep writing above.</p></aside>`;
const PRODUCT_EMBED = `<aside class="sito-callout sito-callout-product" data-sito-embed="product"><p><strong>Featured offer</strong></p><p>Your courses and booking CTA appear below the article for conversion.</p></aside>`;

export function PostCanvasEditor({ postId }: PostCanvasEditorProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(!!postId);
  const [saving, setSaving] = useState(false);
  const [saveLabel, setSaveLabel] = useState("Saved");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("<p></p>");
  const [coverUrl, setCoverUrl] = useState("");
  const [accessLevel, setAccessLevel] = useState<"public" | "subscriber">("public");
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [notify, setNotify] = useState(false);
  const [error, setError] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [currentId, setCurrentId] = useState<string | undefined>(postId);
  const dirtyRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage.configure({ inline: true }),
      TiptapLink.configure({ openOnClick: false }),
      Youtube.configure({ width: 640, height: 360, controls: true }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      setContent(ed.getHTML());
      dirtyRef.current = true;
      setSaveLabel("Unsaved changes");
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-lg max-w-none focus:outline-none min-h-[50vh] px-1 leading-relaxed",
      },
    },
  });

  const load = useCallback(async () => {
    if (!user || !postId) return;
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", postId)
        .eq("expert_id", user.id)
        .single();
      if (err) throw err;
      setTitle(data.title || "");
      setDescription(data.description || "");
      setContent(data.content || "<p></p>");
      setCoverUrl(data.featured_image_url || "");
      setAccessLevel(data.access_level === "subscriber" ? "subscriber" : "public");
      setPublishedAt(data.published_at);
      setCurrentId(data.id);
      editor?.commands.setContent(data.content || "<p></p>");
      dirtyRef.current = false;
      setSaveLabel("Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load post");
    } finally {
      setLoading(false);
    }
  }, [user, postId, supabase, editor]);

  useEffect(() => {
    if (postId) load();
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = async (opts: { publish?: boolean; unpublish?: boolean } = {}) => {
    if (!user) return null;
    if (!title.trim()) {
      setError("Add a title before saving.");
      return null;
    }
    const html = editor?.getHTML() || content;
    if (!html.replace(/<[^>]+>/g, "").trim()) {
      setError("Write some content before saving.");
      return null;
    }

    setSaving(true);
    setError("");
    setSaveLabel("Saving…");
    try {
      const readingTime = readingTimeFromHtml(html);
      let nextPublished = publishedAt;
      if (opts.publish) nextPublished = new Date().toISOString();
      if (opts.unpublish) nextPublished = null;

      const payload = {
        expert_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        content: html,
        featured_image_url: coverUrl || null,
        access_level: accessLevel,
        reading_time_minutes: readingTime,
        published_at: nextPublished,
        updated_at: new Date().toISOString(),
      };

      let savedId = currentId;
      if (currentId) {
        const { error: err } = await supabase
          .from("blog_posts")
          .update(payload)
          .eq("id", currentId)
          .eq("expert_id", user.id);
        if (err) throw err;
      } else {
        const { data, error: err } = await supabase
          .from("blog_posts")
          .insert({
            ...payload,
            notify_subscribers: notify,
            published_at: opts.publish ? nextPublished : null,
          })
          .select("id, published_at")
          .single();
        if (err) throw err;
        savedId = data.id;
        setCurrentId(data.id);
        router.replace(`/dashboard/posts/edit/${data.id}`);
        nextPublished = data.published_at;
      }

      if (opts.publish && notify && savedId) {
        fetch("/api/notify-blog-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blogPostId: savedId,
            expertId: user.id,
            blogTitle: title.trim(),
          }),
        }).catch(() => undefined);
      }

      setPublishedAt(nextPublished);
      dirtyRef.current = false;
      setSaveLabel(opts.publish ? "Published" : "Saved");
      return savedId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaveLabel("Save failed");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const uploadCover = async (file: File) => {
    if (!user) return;
    setUploadingCover(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `blog-covers/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("blog-resources")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("blog-resources").getPublicUrl(path);
      setCoverUrl(data.publicUrl);
      dirtyRef.current = true;
      setSaveLabel("Unsaved changes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover upload failed");
    } finally {
      setUploadingCover(false);
    }
  };

  const insertHtml = (html: string) => {
    editor?.chain().focus().insertContent(html).run();
  };

  if (loading) {
    return <div className="animate-pulse space-y-4 p-6"><div className="h-12 rounded-xl bg-slate-800" /><div className="h-64 rounded-xl bg-slate-900" /></div>;
  }

  const isPublished = !!publishedAt;

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-slate-800/80 bg-slate-950/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/posts"
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-900"
            >
              ← Back
            </Link>
            <span className="text-xs text-slate-500">{saveLabel}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                isPublished ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-200"
              }`}
            >
              {isPublished ? "Published" : "Draft"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => persist()}
              className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900 disabled:opacity-50"
            >
              Save draft
            </button>
            {isPublished && (
              <button
                type="button"
                disabled={saving}
                onClick={() => persist({ unpublish: true })}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:bg-slate-900"
              >
                Unpublish
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => persist({ publish: true })}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
            >
              {isPublished ? "Update" : "Publish"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 py-8">
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Cover */}
        <div
          className="group relative overflow-hidden rounded-2xl border border-dashed border-slate-700 bg-slate-900/40"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file?.type.startsWith("image/")) uploadCover(file);
          }}
        >
          {coverUrl ? (
            <div className="relative aspect-[21/9] w-full">
              <Image src={coverUrl} alt="" fill className="object-cover" sizes="720px" />
              <div className="absolute inset-0 flex items-end justify-end gap-2 bg-gradient-to-t from-black/50 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCoverUrl("");
                    dirtyRef.current = true;
                    setSaveLabel("Unsaved changes");
                  }}
                  className="rounded-lg bg-black/70 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="flex aspect-[21/9] w-full flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-300"
            >
              <span className="text-2xl">🖼</span>
              <span className="text-sm">
                {uploadingCover ? "Uploading…" : "Add cover image (drag & drop or click)"}
              </span>
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadCover(file);
              e.target.value = "";
            }}
          />
        </div>

        <textarea
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            dirtyRef.current = true;
            setSaveLabel("Unsaved changes");
          }}
          rows={1}
          placeholder="Post title"
          className="w-full resize-none bg-transparent text-4xl font-bold tracking-tight text-slate-50 placeholder:text-slate-600 outline-none"
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }}
        />

        <input
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            dirtyRef.current = true;
            setSaveLabel("Unsaved changes");
          }}
          placeholder="Subtitle / excerpt (shown in lists and previews)"
          className="w-full bg-transparent text-lg text-slate-400 placeholder:text-slate-600 outline-none"
        />

        <div className="flex flex-wrap items-center gap-3 border-y border-slate-800/80 py-3 text-sm">
          <label className="flex items-center gap-2 text-slate-400">
            <span>Visibility</span>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as "public" | "subscriber")}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
            >
              <option value="public">Public</option>
              <option value="subscriber">Subscribers</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-slate-400">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="rounded border-slate-600"
            />
            Notify subscribers on publish
          </label>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => insertHtml(LEAD_EMBED)}
              className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-sky-300 hover:bg-slate-900"
            >
              + Lead magnet block
            </button>
            <button
              type="button"
              onClick={() => insertHtml(PRODUCT_EMBED)}
              className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-sky-300 hover:bg-slate-900"
            >
              + Product card block
            </button>
          </div>
        </div>

        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 120 }}
            className="flex overflow-hidden rounded-xl border border-slate-600 bg-slate-900 shadow-xl"
          >
            {(
              [
                { label: "B", action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
                { label: "I", action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
                { label: "H2", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
                { label: "“”", action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote") },
                {
                  label: "Link",
                  action: () => {
                    const url = window.prompt("URL");
                    if (url) editor.chain().focus().setLink({ href: url }).run();
                  },
                  active: editor.isActive("link"),
                },
              ] as const
            ).map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={btn.action}
                className={`px-3 py-2 text-sm font-medium ${
                  btn.active ? "bg-sky-500 text-slate-950" : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </BubbleMenu>
        )}

        <EditorContent editor={editor} />

        {currentId && isPublished && (
          <p className="text-center text-sm text-slate-500">
            Live at{" "}
            <Link href={`/blog/${currentId}`} className="text-sky-400 hover:underline" target="_blank">
              /blog/{currentId.slice(0, 8)}…
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
