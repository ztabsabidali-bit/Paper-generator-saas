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
import { assignableRoles } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import type { Institution, StaffMember } from "@/types/domain";

export function UsersManager({
  users,
  currentUserId,
  currentRole,
  institutions,
}: {
  users: StaffMember[];
  currentUserId: string;
  currentRole: UserRole;
  institutions: Institution[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const roles = assignableRoles(currentRole);
  const isDeveloper = currentRole === "super_admin";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(roles.includes("teacher") ? "teacher" : "admin");
  const [institutionId, setInstitutionId] = useState(institutions[0]?.id ?? "");

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await createUserAction({
        full_name: fullName,
        email,
        password,
        role,
        institution_id: isDeveloper ? (institutionId || null) : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setFullName("");
      setEmail("");
      setPassword("");
      setRole(roles.includes("teacher") ? "teacher" : "admin");
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

  function toggleStatus(user: StaffMember) {
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

  function remove(user: StaffMember) {
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
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
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
              const targetIsSuperAdmin = user.role === "super_admin";
              const canTouch = !isSelf && (isDeveloper || !targetIsSuperAdmin);
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
                      {user.institution?.name ?? "No institution"} · Joined{" "}
                      {formatDate(user.created_at)} ·{" "}
                      <span className={roleMeta.className.split(" ")[1]}>
                        {roleMeta.label}
                      </span>
                    </p>
                  </div>

                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <Select
                      value={user.role}
                      onChange={(event) => changeRole(user.id, event.target.value as UserRole)}
                      disabled={!canTouch || (pending && busyId === user.id)}
                      className="h-8 min-w-0 flex-1 text-xs sm:w-32 sm:flex-none"
                      aria-label={`Role for ${user.email}`}
                    >
                      {(roles.includes(user.role) ? roles : [user.role, ...roles]).map((value) => (
                        <option key={value} value={value}>
                          {ROLE_META[value].label}
                        </option>
                      ))}
                    </Select>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStatus(user)}
                      disabled={!canTouch || (pending && busyId === user.id)}
                      title={user.is_active ? "Deactivate" : "Activate"}
                    >
                      {user.is_active ? (
                        <UserX className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </Button>

                    {isDeveloper ? (
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
                    ) : null}
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
                {roles.map((value) => (
                  <option key={value} value={value}>
                    {ROLE_META[value].label} — {ROLE_META[value].description}
                  </option>
                ))}
              </Select>
            </Field>
            {isDeveloper && role !== "super_admin" ? (
              <Field
                label="Institution"
                htmlFor="new-institution"
                hint={
                  institutions.length === 0
                    ? "Add an institution first from the Institutions page."
                    : undefined
                }
                required
              >
                <Select
                  id="new-institution"
                  value={institutionId}
                  onChange={(event) => setInstitutionId(event.target.value)}
                  required
                >
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={pending || (isDeveloper && role !== "super_admin" && !institutionId)}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-4 w-4" aria-hidden />
              )}
              Create account
            </Button>
          </form>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            Account creation uses the Supabase service-role key on the server. Roles and
            institutions are re-checked in Postgres before any write.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
