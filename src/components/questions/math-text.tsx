import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { cn } from "@/lib/utils";
import type { TextDirection } from "@/types/database";

const REMARK_PLUGINS = [remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

/**
 * Renders question text as Markdown with KaTeX math.
 * Raw HTML is intentionally not enabled — teacher input is untrusted.
 */
export function MathText({
  content,
  direction = "ltr",
  className,
  compact = false,
}: {
  content: string;
  direction?: TextDirection;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      dir={direction}
      lang={direction === "rtl" ? "ur" : "en"}
      className={cn(
        "question-prose",
        direction === "rtl" && "text-urdu",
        compact && "text-[13px] leading-relaxed",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
