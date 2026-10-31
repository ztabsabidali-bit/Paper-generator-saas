"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2, UserCheck, UserX } from "lucide-react";
import {
  createUserAction,
  deleteUserAction,
  updateUserRoleAction,
  updateUserStatusAction,
} from "@/actions/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/shell";
import { ROLE_META } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import type { Profile } from "@/types/domain";

export function UsersManager({
  users,
  currentUserId,
}: {
  users: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("teacher");

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await createUserAction({ full_name: fullName, email, password, role });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("teacher");
      setNotice("Account created. Share the temporary password securely.");
      router.refresh();
    });
  }

  function changeRole(id: string, nextRole: UserRole) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const result = await updateUserRoleAction({ id, role: nextRole });
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function toggleStatus(user: Profile) {
    setError(null);
    setBusyId(user.id);
    startTransition(async () => {
      const result = await updateUserStatusAction({
        id: user.id,
        is_active: !user.is_active,
      });
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(user: Profile) {
    if (
      !window.confirm(
        `Delete ${user.full_name ?? user.email}? Their questions stay, but the account is removed.`,
      )
    ) {
      return;
    }
    setError(null);
    setBusyId(user.id);
    startTransition(async () => {
      const result = await deleteUserAction(user.id);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Staff accounts</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-slate-100">
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const roleMeta = ROLE_META[user.role];
              return (
                <li key={user.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      {user.full_name ?? "Unnamed"}
                      {isSelf ? <Badge tone="brand">You</Badge> : null}
                      {!user.is_active ? <Badge tone="danger">Disabled</Badge> : null}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Joined {formatDate(user.created_at)} ·{" "}
                      <span className={roleMeta.className.split(" ")[1]}>
                        {roleMeta.label}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={user.role}
                      onChange={(event) => changeRole(user.id, event.target.value as UserRole)}
                      disabled={isSelf || (pending && busyId === user.id)}
                      className="h-8 w-32 text-xs"
                      aria-label={`Role for ${user.email}`}
                    >
                      {Object.entries(ROLE_META).map(([value, meta]) => (
                        <option key={value} value={value}>
                          {meta.label}
                        </option>
                      ))}
                    </Select>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStatus(user)}
                      disabled={isSelf || (pending && busyId === user.id)}
                      title={user.is_active ? "Deactivate" : "Activate"}
                    >
                      {user.is_active ? (
                        <UserX className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(user)}
                      disabled={isSelf || (pending && busyId === user.id)}
                      title="Delete account"
                    >
                      {pending && busyId === user.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="Full name" htmlFor="full-name" required>
              <Input
                id="full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ayesha Khan"
                required
              />
            </Field>
            <Field label="Email" htmlFor="new-email" required>
              <Input
                id="new-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ayesha@school.edu"
                required
              />
            </Field>
            <Field
              label="Temporary password"
              htmlFor="new-password"
              hint="At least 8 characters. Ask the user to change it after first sign-in."
              required
            >
              <Input
                id="new-password"
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </Field>
            <Field label="Role" htmlFor="new-role">
              <Select
                id="new-role"
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
              >
                {Object.entries(ROLE_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label} — {meta.description}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-4 w-4" aria-hidden />
              )}
              Create account
            </Button>
          </form>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            Account creation uses the Supabase service-role key on the server. Roles are
            re-checked in Postgres before any write.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
