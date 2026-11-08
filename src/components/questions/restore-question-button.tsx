"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { restoreQuestionAction } from "@/actions/questions";
import { Button } from "@/components/ui/button";

export function RestoreQuestionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function restore() {
    startTransition(async () => {
      const result = await restoreQuestionAction(id);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={restore} disabled={pending} title="Restore">
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
      )}
      Restore
    </Button>
  );
}
