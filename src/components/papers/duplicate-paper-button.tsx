"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Copy, Loader2 } from "lucide-react";
import { duplicatePaperAction } from "@/actions/papers";
import { Button } from "@/components/ui/button";

export function DuplicatePaperButton({
  id,
  label = "Duplicate",
  size = "sm",
  variant = "ghost",
  redirect = false,
}: {
  id: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  /** Open the copy instead of staying on the current page. */
  redirect?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function duplicate() {
    startTransition(async () => {
      const result = await duplicatePaperAction(id);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      if (redirect) {
        router.push(`/papers/${result.data.id}`);
      }
      router.refresh();
    });
  }

  return (
    <Button variant={variant} size={size} onClick={duplicate} disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Copy className="h-4 w-4" aria-hidden />
      )}
      {label}
    </Button>
  );
}
