import { resolvePrintOptions } from "@/lib/papers/print-options";
import { detectTextDirection } from "@/lib/questions/direction";
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
  const urduWatermark = detectTextDirection(institutionName) === "rtl";
  // Shrink long names so the single line still reads as a watermark. The SVG
  // `textLength` below guarantees the fit even if this estimate is off.
  const watermarkSize = Math.min(
    150,
    Math.round(940 / Math.max(institutionName.length * 0.62, 1)),
  );

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
          {/*
            An SVG instead of a fixed-px <span>: `textLength` +
            `lengthAdjust="spacingAndGlyphs"` squashes a long institution name
            to exactly 96% of the viewBox width, so the rotated text can never
            spill outside the printable page. The viewBox line is then rotated
            around the centre of the page box.
          */}
          <svg
            viewBox="0 0 1000 220"
            preserveAspectRatio="xMidYMid meet"
            className="w-[115%] -rotate-[30deg]"
          >
            <text
              x="500"
              y="110"
              textAnchor="middle"
              dominantBaseline="middle"
              textLength="960"
              lengthAdjust="spacingAndGlyphs"
              direction={urduWatermark ? "rtl" : "ltr"}
              fontSize={watermarkSize}
              fontWeight="700"
              fill="currentColor"
              fillOpacity="0.06"
              className="text-slate-900"
            >
              {institutionName}
            </text>
          </svg>
        </div>
      ) : null}
    </>
  );
}
