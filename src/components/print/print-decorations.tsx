import { resolvePrintOptions } from "@/lib/papers/print-options";
import type { PaperPrintOptions } from "@/types/domain";

/**
 * Printer-only decorations that apply to the whole document rather than to one
 * sheet: page numbers and an optional institution watermark.
 *
 * Page numbers use the CSS `@page` margin box. Chrome prints them without any
 * client JavaScript, and the browser's own header/footer can stay switched off.
 */
export function PrintDecorations({
  options,
  institutionName,
}: {
  options: PaperPrintOptions | unknown;
  institutionName: string;
}) {
  const resolved = resolvePrintOptions(options);

  return (
    <>
      {resolved.page_numbers ? (
        <style>{`@page {
  @bottom-center {
    content: "Page " counter(page) " of " counter(pages);
    font-family: "Inter", Arial, sans-serif;
    font-size: 8.5pt;
    color: #64748b;
  }
}`}</style>
      ) : null}

      {resolved.watermark && institutionName ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 hidden select-none items-center justify-center overflow-hidden print:flex"
        >
          <span className="-rotate-[30deg] whitespace-nowrap text-[110px] font-bold uppercase tracking-[0.15em] text-slate-900/[0.06]">
            {institutionName}
          </span>
        </div>
      ) : null}
    </>
  );
}
