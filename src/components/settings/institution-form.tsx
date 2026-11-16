"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Loader2, Save, Upload } from "lucide-react";
import { saveInstitutionAction, uploadInstitutionLogoAction } from "@/actions/institution";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/shell";
import type { InstitutionSettings } from "@/types/domain";

export function InstitutionForm({
  institution,
  institutionId,
}: {
  institution: InstitutionSettings;
  institutionId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(institution.name);
  const [tagline, setTagline] = useState(institution.tagline ?? "");
  const [address, setAddress] = useState(institution.address ?? "");
  const [logoUrl, setLogoUrl] = useState(institution.logo_url ?? "");
  const [examSession, setExamSession] = useState(institution.exam_session ?? "");
  const [footerNote, setFooterNote] = useState(institution.footer_note ?? "");

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file twice still fires a change event.
    event.target.value = "";
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Use a PNG, JPG or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Keep the logo under 2 MB.");
      return;
    }

    setError(null);
    setNotice(null);
    setUploading(true);
    const data = new FormData();
    data.set("logo", file);
    if (institutionId) data.set("institution_id", institutionId);

    const result = await uploadInstitutionLogoAction(data);
    setUploading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setLogoUrl(result.data.url);
    setNotice("Logo uploaded. It will appear on the institution header.");
    router.refresh();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await saveInstitutionAction({
        institution_id: institutionId,
        name,
        tagline,
        address,
        logo_url: logoUrl,
        exam_session: examSession,
        footer_note: footerNote,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice("Institution profile saved.");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle>Print header</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? <Alert tone="danger">{error}</Alert> : null}
            {notice ? <Alert tone="success">{notice}</Alert> : null}

            <Field label="Institution name" htmlFor="name" required>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>

            <Field label="Tagline" htmlFor="tagline">
              <Input
                id="tagline"
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                placeholder="Excellence in knowledge and character"
              />
            </Field>

            <Field label="Address" htmlFor="address">
              <Input
                id="address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="12-A Model Town, Lahore"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Exam session" htmlFor="session">
                <Input
                  id="session"
                  value={examSession}
                  onChange={(event) => setExamSession(event.target.value)}
                  placeholder="2026-27"
                />
              </Field>

              <Field
                label="Logo URL"
                htmlFor="logo"
                hint="Optional. Paste a public image URL, or upload a file below."
              >
                <Input
                  id="logo"
                  value={logoUrl}
                  onChange={(event) => setLogoUrl(event.target.value)}
                  placeholder="https://…/logo.png"
                />
              </Field>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800">Upload a logo</p>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    PNG, JPG or WebP up to 2 MB. Square images print best. The file is stored
                    with this institution&apos;s branding.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Upload className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {uploading ? "Uploading…" : "Upload image"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  className="hidden"
                  aria-label="Upload institution logo"
                />
              </div>
            </div>

            <Field label="Footer note" htmlFor="footer">
              <Textarea
                id="footer"
                value={footerNote}
                onChange={(event) => setFooterNote(event.target.value)}
                rows={2}
                placeholder="Paper generated with PaperForge — verify before printing."
              />
            </Field>

            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4" aria-hidden />
                )}
                Save profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <aside className="xl:sticky xl:top-20 xl:h-fit">
        <Card>
          <CardHeader>
            <CardTitle>Header preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-2">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-10 w-10 object-contain" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-[8px] uppercase text-slate-400">
                    Logo
                  </div>
                )}
                <div className="min-w-0 flex-1 text-center">
                  <p className="truncate text-[11px] font-bold uppercase tracking-wide">
                    {name || "Institution name"}
                  </p>
                  {tagline ? (
                    <p className="truncate text-[8px] italic text-slate-500">{tagline}</p>
                  ) : null}
                  {address ? (
                    <p className="truncate text-[8px] text-slate-400">{address}</p>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 text-center text-[9px] text-slate-500">
                Session {examSession || "—"}
              </p>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              The header appears on every printed set. The answer key is marked confidential
              and always prints on its own page.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
