"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { saveInstitutionAction } from "@/actions/institution";
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
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState(institution.name);
  const [tagline, setTagline] = useState(institution.tagline ?? "");
  const [address, setAddress] = useState(institution.address ?? "");
  const [logoUrl, setLogoUrl] = useState(institution.logo_url ?? "");
  const [examSession, setExamSession] = useState(institution.exam_session ?? "");
  const [footerNote, setFooterNote] = useState(institution.footer_note ?? "");

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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
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

            <div className="grid gap-4 sm:grid-cols-2">
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
                hint="Public Supabase Storage or CDN URL. Printed at 64×64."
              >
                <Input
                  id="logo"
                  value={logoUrl}
                  onChange={(event) => setLogoUrl(event.target.value)}
                  placeholder="https://…/logo.png"
                />
              </Field>
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

      <aside className="lg:sticky lg:top-20 lg:h-fit">
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
                <div className="min-w-0 text-center">
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
