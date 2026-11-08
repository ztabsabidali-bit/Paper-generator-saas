"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Archive, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import {
  bulkArchiveQuestionsAction,
  bulkDeleteQuestionsAction,
  bulkRestoreQuestionsAction,
} from "@/actions/questions";
import { Button } from "@/components/ui/button";
import { useQuestionSelection } from "./question-selection";

type BulkAction = "archive" | "restore" | "delete";

export function QuestionBulkBar() {
  const { selected, clear } = useQuestionSelection();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const ids = [...selected];
  if (ids.length === 0) return null;

  function run(action: BulkAction) {
    const count = ids.length;

    if (
      action === "delete" &&
      !window.confirm(
        `Delete ${count} question${count === 1 ? "" : "s"} permanently? Questions used in a paper will be skipped. This cannot be undone.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      if (action === "delete") {
        const result = await bulkDeleteQuestionsAction(ids);
        if (!result.ok) {
          window.alert(result.error);
          return;
        }

        const skipped = result.data.blocked + result.data.skipped;
        window.alert(
          `Deleted ${result.data.deleted} question${result.data.deleted === 1 ? "" : "s"}.` +
            (skipped > 0
              ? ` ${skipped} skipped (used in a paper or not yours to edit).`
              : ""),
        );
      } else {
        const result =
          action === "archive"
            ? await bulkArchiveQuestionsAction(ids)
            : await bulkRestoreQuestionsAction(ids);

        if (!result.ok) {
          window.alert(result.error);
          return;
        }

        window.alert(
          `${action === "archive" ? "Archived" : "Restored"} ${result.data.updated} question${
            result.data.updated === 1 ? "" : "s"
          }.` +
            (result.data.skipped > 0 ? ` ${result.data.skipped} skipped.` : ""),
        );
      }

      clear();
      router.refresh();
    });
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2">
      <span className="text-xs font-semibold text-brand-800">
        {ids.length} selected
      </span>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => run("archive")}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Archive className="h-3.5 w-3.5" aria-hidden />
          )}
          Archive
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => run("restore")}
          disabled={pending}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Restore
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => run("delete")}
          disabled={pending}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          Delete
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          disabled={pending}
          title="Clear selection"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Clear
        </Button>
      </div>
    </div>
  );
}
