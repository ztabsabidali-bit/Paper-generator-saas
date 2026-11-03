"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Building2, Loader2, Plus, Settings2, Users } from "lucide-react";
import { createInstitutionAction } from "@/actions/institution";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/shell";
import { formatDate } from "@/lib/utils";
import type { Institution } from "@/types/domain";

export function InstitutionsManager({ institutions }: { institutions: Institution[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [address, setAddress] = useState("");
  const [examSession, setExamSession] = useState("");

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await createInstitutionAction({
        name,
        tagline,
        address,
        exam_session: examSession,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName("");
      setTagline("");
      setAddress("");
      setExamSession("");
      setNotice("Institution created. Add its head from the Staff page.");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Institutions</CardTitle>
          </CardHeader>
          {institutions.length === 0 ? (
            <CardContent className="text-sm text-slate-500">
              No institutions yet. Create the first one on the right.
            </CardContent>
          ) : (
            <ul className="divide-y divide-slate-100">
              {institutions.map((institution) => (
                <li
                  key={institution.id}
                  className="flex flex-wrap items-center gap-3 px-5 py-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <Building2 className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {institution.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {[institution.address, institution.exam_session]
                        .filter(Boolean)
                        .join(" · ") || "No address or session set"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Added {formatDate(institution.created_at)}
                    </p>
                  </div>
                  <div className="flex w-full items-center gap-1.5 sm:w-auto">
                    <Link
                      href={`/users`}
                      className={buttonClasses("ghost", "sm")}
                      title="Manage staff"
                    >
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      Staff
                    </Link>
                    <Link
                      href={`/institutions/${institution.id}`}
                      className={buttonClasses("outline", "sm")}
                    >
                      <Settings2 className="h-3.5 w-3.5" aria-hidden />
                      Manage
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Add institution</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="Name" htmlFor="institution-name" required>
              <Input
                id="institution-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Govt. High School BTM"
                required
              />
            </Field>
            <Field label="Tagline" htmlFor="institution-tagline">
              <Input
                id="institution-tagline"
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                placeholder="Excellence in knowledge and character"
              />
            </Field>
            <Field label="Address" htmlFor="institution-address">
              <Input
                id="institution-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="BTM Burewala"
              />
            </Field>
            <Field label="Exam session" htmlFor="institution-session">
              <Input
                id="institution-session"
                value={examSession}
                onChange={(event) => setExamSession(event.target.value)}
                placeholder="2026-27"
              />
            </Field>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-4 w-4" aria-hidden />
              )}
              Create institution
            </Button>
          </form>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            After creating the school, open Staff and create its head with the Admin role.
            Only a super admin can add institutions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
