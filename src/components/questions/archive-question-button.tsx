"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Archive, Loader2 } from "lucide-react";
import { archiveQuestionAction } from "@/actions/questions";
import { Button } from "@/components/ui/button";

export function ArchiveQuestionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function archive() {
    if (!window.confirm("Archive this question? It stays attached to existing papers.")) {
      return;
    }
    startTransition(async () => {
      const result = await archiveQuestionAction(id);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={archive} disabled={pending} title="Archive">
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Archive className="h-3.5 w-3.5" aria-hidden />
      )}
      Archive
    </Button>
  );
}
