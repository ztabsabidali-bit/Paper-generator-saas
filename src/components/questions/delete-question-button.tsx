"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteQuestionAction } from "@/actions/questions";
import { Button } from "@/components/ui/button";

export function DeleteQuestionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    if (
      !window.confirm(
        "Delete this question permanently? This cannot be undone. Questions already used in a paper must be archived instead.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteQuestionAction(id);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={remove}
      disabled={pending}
      title="Delete"
      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      )}
      <span className="sr-only">Delete</span>
    </Button>
  );
}
