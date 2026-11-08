"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface SelectionContextValue {
  selected: Set<string>;
  ids: string[];
  allSelected: boolean;
  someSelected: boolean;
  toggle: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function QuestionSelectionProvider({
  ids,
  children,
}: {
  ids: string[];
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const toggleAll = useCallback(() => {
    setSelected((current) => (current.size === ids.length ? new Set() : new Set(ids)));
  }, [ids]);

  const value = useMemo<SelectionContextValue>(
    () => ({
      selected,
      ids,
      allSelected: ids.length > 0 && selected.size === ids.length,
      someSelected: selected.size > 0 && selected.size < ids.length,
      toggle,
      toggleAll,
      clear,
    }),
    [selected, ids, toggle, toggleAll, clear],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useQuestionSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("Question selection components must sit inside QuestionSelectionProvider.");
  }
  return context;
}

const CHECKBOX_CLASSES =
  "h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500";

export function QuestionSelectCheckbox({ id }: { id: string }) {
  const { selected, toggle } = useQuestionSelection();
  return (
    <input
      type="checkbox"
      checked={selected.has(id)}
      onChange={() => toggle(id)}
      aria-label="Select question"
      className={CHECKBOX_CLASSES}
    />
  );
}

export function QuestionSelectAllCheckbox() {
  const { allSelected, someSelected, toggleAll } = useQuestionSelection();
  return (
    <input
      type="checkbox"
      checked={allSelected}
      onChange={toggleAll}
      ref={(element) => {
        if (element) element.indeterminate = someSelected;
      }}
      aria-label="Select all questions on this page"
      className={CHECKBOX_CLASSES}
    />
  );
}
