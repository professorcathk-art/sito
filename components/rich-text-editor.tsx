"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight } from "lowlight";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import css from "highlight.js/lib/languages/css";
import html from "highlight.js/lib/languages/xml";

const lowlight = createLowlight();
lowlight.register("javascript", javascript);
lowlight.register("typescript", typescript);
lowlight.register("python", python);
lowlight.register("css", css);
lowlight.register("html", html);
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onFileUpload?: (fileUrl: string, fileName: string, fileType: string, fileSize: number) => void;
  placeholder?: string;
}

export function RichTextEditor({
  content,
  onChange,
  onFileUpload,
  placeholder = "Start writing...",
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [isRawHtmlMode, setIsRawHtmlMode] = useState(false);
  const [rawHtmlContent, setRawHtmlContent] = useState(content);
  const supabase = createClient();

  // Sync rawHtmlContent when content prop changes externally
  useEffect(() => {
    if (!isRawHtmlMode) {
      setRawHtmlContent(content);
    }
  }, [content, isRawHtmlMode]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-cyber-green underline",
        },
      }),
      Youtube.configure({
        width: 640,
        height: 480,
        controls: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
  });

  const handleImageUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !editor) return;

      setUploading(true);
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `blog-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("blog-resources")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("blog-resources").getPublicUrl(filePath);
        
        editor.chain().focus().setImage({ src: data.publicUrl }).run();
        
        if (onFileUpload) {
          onFileUpload(data.publicUrl, file.name, file.type, file.size);
        }
      } catch (err: any) {
        console.error("Error uploading image:", err);
        alert("Failed to upload image. Please try again.");
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleFileUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.txt,.zip,.rar";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !editor || !onFileUpload) return;

      setUploading(true);
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `blog-files/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("blog-resources")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("blog-resources").getPublicUrl(filePath);
        
        // Insert a link to the file in the editor
        editor.chain().focus().insertContent(`<a href="${data.publicUrl}" target="_blank" rel="noopener noreferrer">📎 ${file.name}</a>`).run();
        
        onFileUpload(data.publicUrl, file.name, file.type, file.size);
      } catch (err: any) {
        console.error("Error uploading file:", err);
        alert("Failed to upload file. Please try again.");
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const addYoutubeVideo = () => {
    const url = prompt("Enter YouTube URL:");
    if (url && editor) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  };

  const addVimeoVideo = () => {
    const url = prompt("Enter Vimeo URL:");
    if (url && editor) {
      // For Vimeo, we'll use an iframe embed
      const vimeoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      if (vimeoId) {
        editor.chain().focus().insertContent(
          `<iframe src="https://player.vimeo.com/video/${vimeoId}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`
        ).run();
      }
    }
  };

  const addPodcastAudio = () => {
    const url = prompt("Enter audio file URL (or upload):");
    if (url && editor) {
      editor.chain().focus().insertContent(
        `<audio controls src="${url}" style="width: 100%; max-width: 600px;"></audio>`
      ).run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-cyber-green/30 rounded-lg bg-dark-green-900/30">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-3 border-b border-cyber-green/30 bg-dark-green-800/30">
        {/* Text formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            editor.isActive("bold")
              ? "bg-cyber-green text-dark-green-900"
              : "bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800"
          }`}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            editor.isActive("italic")
              ? "bg-cyber-green text-dark-green-900"
              : "bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800"
          }`}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            editor.isActive("strike")
              ? "bg-cyber-green text-dark-green-900"
              : "bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800"
          }`}
        >
          <s>S</s>
        </button>

        {/* Headers */}
        <div className="border-l border-cyber-green/30 pl-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              editor.isActive("heading", { level: 1 })
                ? "bg-cyber-green text-dark-green-900"
                : "bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800"
            }`}
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              editor.isActive("heading", { level: 2 })
                ? "bg-cyber-green text-dark-green-900"
                : "bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800"
            }`}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              editor.isActive("heading", { level: 3 })
                ? "bg-cyber-green text-dark-green-900"
                : "bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800"
            }`}
          >
            H3
          </button>
        </div>

        {/* Lists */}
        <div className="border-l border-cyber-green/30 pl-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              editor.isActive("bulletList")
                ? "bg-cyber-green text-dark-green-900"
                : "bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800"
            }`}
          >
            •
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              editor.isActive("orderedList")
                ? "bg-cyber-green text-dark-green-900"
                : "bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800"
            }`}
          >
            1.
          </button>
        </div>

        {/* Code */}
        <div className="border-l border-cyber-green/30 pl-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            disabled={!editor.can().chain().focus().toggleCode().run()}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              editor.isActive("code")
                ? "bg-cyber-green text-dark-green-900"
                : "bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800"
            }`}
          >
            &lt;/&gt;
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              editor.isActive("codeBlock")
                ? "bg-cyber-green text-dark-green-900"
                : "bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800"
            }`}
          >
            { }
          </button>
        </div>

        {/* Media */}
        <div className="border-l border-cyber-green/30 pl-2">
          <button
            type="button"
            onClick={handleImageUpload}
            disabled={uploading}
            className="px-3 py-1.5 rounded text-sm font-medium transition-colors bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800 disabled:opacity-50"
          >
            {uploading ? "..." : "🖼️"}
          </button>
          <button
            type="button"
            onClick={handleFileUpload}
            disabled={uploading || !onFileUpload}
            className="px-3 py-1.5 rounded text-sm font-medium transition-colors bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800 disabled:opacity-50"
          >
            📎
          </button>
          <button
            type="button"
            onClick={addYoutubeVideo}
            className="px-3 py-1.5 rounded text-sm font-medium transition-colors bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800"
          >
            ▶️
          </button>
          <button
            type="button"
            onClick={addVimeoVideo}
            className="px-3 py-1.5 rounded text-sm font-medium transition-colors bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800"
          >
            🎬
          </button>
          <button
            type="button"
            onClick={addPodcastAudio}
            className="px-3 py-1.5 rounded text-sm font-medium transition-colors bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800"
          >
            🎵
          </button>
        </div>

        {/* Link */}
        <div className="border-l border-cyber-green/30 pl-2">
          <button
            type="button"
            onClick={() => {
              const url = window.prompt("Enter URL:");
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              editor.isActive("link")
                ? "bg-cyber-green text-dark-green-900"
                : "bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800"
            }`}
          >
            🔗
          </button>
        </div>

        {/* Raw HTML Mode Toggle */}
        <div className="border-l border-cyber-green/30 pl-2 ml-auto">
          <button
            type="button"
            onClick={() => {
              if (isRawHtmlMode) {
                // Switching from raw HTML to editor mode
                onChange(rawHtmlContent);
                if (editor) {
                  editor.commands.setContent(rawHtmlContent);
                }
              } else {
                // Switching from editor to raw HTML mode
                const htmlContent = editor?.getHTML() || content;
                setRawHtmlContent(htmlContent);
              }
              setIsRawHtmlMode(!isRawHtmlMode);
            }}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isRawHtmlMode
                ? "bg-cyber-green text-dark-green-900"
                : "bg-dark-green-900/50 text-custom-text hover:bg-dark-green-800"
            }`}
          >
            {isRawHtmlMode ? "📝 Editor" : "🔧 HTML"}
          </button>
        </div>
      </div>

      {/* Editor or Raw HTML */}
      {isRawHtmlMode ? (
        <textarea
          value={rawHtmlContent}
          onChange={(e) => {
            setRawHtmlContent(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full min-h-[300px] p-4 bg-dark-green-900/50 border-0 text-custom-text font-mono text-sm focus:outline-none resize-y"
          placeholder="Enter raw HTML code here..."
        />
      ) : (
        <EditorContent editor={editor} className="min-h-[300px]" />
      )}
    </div>
  );
}

