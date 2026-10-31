"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deletePaperAction } from "@/actions/papers";
import { Button } from "@/components/ui/button";

export function DeletePaperButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (
      !window.confirm(
        "Delete this paper and all of its sets? The questions stay in the bank.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deletePaperAction(id);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      router.push("/papers");
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="md" onClick={remove} disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Trash2 className="h-4 w-4" aria-hidden />
      )}
      Delete
    </Button>
  );
}
