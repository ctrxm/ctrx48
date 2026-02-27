import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertCircle, Timer, Image, Link2, Type, X, Upload, Loader2, ExternalLink, Tag, Users
} from "lucide-react";
import type { GroupWithInfo } from "@shared/schema";

type PostType = "text" | "image" | "link";

const FLAIR_OPTIONS = ["Diskusi", "Curhat", "Meme", "Berita", "Opini"];

export default function NewPost() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const searchStr = useSearch();
  const searchParams = new URLSearchParams(searchStr);
  const groupSlug = searchParams.get("group");

  const [postType, setPostType] = useState<PostType>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [flair, setFlair] = useState<string>("");
  const [linkPreview, setLinkPreview] = useState<{ title: string | null; description: string | null; image: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: group } = useQuery<GroupWithInfo>({
    queryKey: ["/api/groups", groupSlug],
    enabled: !!groupSlug,
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const body: any = { title, content, type: postType };
      if (postType === "image" && imageUrl) body.imageUrl = imageUrl;
      if (postType === "link" && linkUrl) body.linkUrl = linkUrl;
      if (flair) body.flair = flair;
      if (group) body.groupId = group.id;
      return apiRequest("POST", "/api/posts", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      if (groupSlug) {
        queryClient.invalidateQueries({ queryKey: ["/api/groups", groupSlug, "posts"] });
        setLocation(`/groups/${groupSlug}`);
      } else {
        setLocation("/");
      }
    },
    onError: (err: any) => setError(err.message?.replace(/^\d+:\s*/, "") || "Gagal membuat postingan"),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Upload gagal");
      }
      const data = await res.json();
      setImageUrl(data.url);
    } catch (err: any) {
      setError(err.message || "Upload gagal");
    } finally {
      setUploading(false);
    }
  };

  const fetchPreview = async () => {
    if (!linkUrl) return;
    try {
      const res = await apiRequest("POST", "/api/link-preview", { url: linkUrl });
      const data = await res.json();
      setLinkPreview(data);
    } catch {
      setLinkPreview(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const typeOptions: { key: PostType; label: string; icon: any }[] = [
    { key: "text", label: "Teks", icon: Type },
    { key: "image", label: "Gambar", icon: Image },
    { key: "link", label: "Tautan", icon: Link2 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-foreground mb-1">Buat Postingan</h1>
        <p className="text-sm text-muted-foreground mb-6">Bagikan pemikiranmu dengan komunitas</p>

        <div className="bg-card border border-card-border rounded-xl p-5 sm:p-6">
          {group && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/10 rounded-lg text-xs text-primary mb-4" data-testid="group-context">
              <Users className="w-4 h-4 shrink-0" />
              <span>Posting ke grup <strong>g/{group.slug}</strong></span>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/10 rounded-lg text-xs text-primary mb-5">
            <Timer className="w-4 h-4 shrink-0" />
            <span>Postingan ini akan kedaluwarsa dalam 48 jam. Tidak bisa diedit setelah diposting.</span>
          </div>

          <div className="flex items-center gap-1 bg-accent/50 rounded-lg p-1 mb-5">
            {typeOptions.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setPostType(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs rounded-md transition-colors ${
                  postType === key ? "bg-card text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-post-type-${key}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">Judul</Label>
              <Input
                id="title"
                placeholder="Judul yang menarik..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="h-10"
                data-testid="input-title"
              />
              <p className="text-[11px] text-muted-foreground text-right">{title.length}/200</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Flair (opsional)
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {FLAIR_OPTIONS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFlair(flair === f ? "" : f)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                      flair === f
                        ? "bg-primary text-white border-primary"
                        : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                    data-testid={`flair-${f}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {postType === "image" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Gambar</Label>
                {imageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img src={imageUrl} alt="Preview upload" className="w-full max-h-64 object-cover" />
                    <button
                      onClick={() => { setImageUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                      data-testid="button-remove-image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="dropzone-image"
                  >
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Klik untuk upload gambar</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">JPEG, PNG, GIF, WebP — maks 5MB</p>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                  data-testid="input-file"
                />
              </div>
            )}

            {postType === "link" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">URL Tautan</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://contoh.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="h-10 flex-1"
                    data-testid="input-link-url"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-3"
                    onClick={fetchPreview}
                    disabled={!linkUrl}
                    data-testid="button-fetch-preview"
                  >
                    Pratinjau
                  </Button>
                </div>
                {linkPreview && (linkPreview.title || linkPreview.description) && (
                  <div className="border border-border rounded-lg overflow-hidden" data-testid="link-preview">
                    {linkPreview.image && (
                      <img src={linkPreview.image} alt="" className="w-full h-40 object-cover" />
                    )}
                    <div className="p-3">
                      {linkPreview.title && (
                        <p className="text-sm font-medium text-foreground line-clamp-1">{linkPreview.title}</p>
                      )}
                      {linkPreview.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{linkPreview.description}</p>
                      )}
                      <p className="text-xs text-primary/70 mt-1 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        {linkUrl}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="content" className="text-sm font-medium">
                {postType === "text" ? "Konten" : "Deskripsi (opsional)"}
              </Label>
              <Textarea
                id="content"
                placeholder={postType === "text" ? "Apa yang ada di pikiranmu?" : "Tambahkan deskripsi..."}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px] resize-none"
                data-testid="textarea-content"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                className="text-sm"
                onClick={() => groupSlug ? setLocation(`/groups/${groupSlug}`) : setLocation("/")}
              >
                Batal
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={
                  !title.trim() ||
                  (!content.trim() && postType === "text") ||
                  (postType === "image" && !imageUrl) ||
                  (postType === "link" && !linkUrl) ||
                  createMutation.isPending
                }
                className="h-10 px-6"
                data-testid="button-create-post"
              >
                {createMutation.isPending ? "Memposting..." : "Posting"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
