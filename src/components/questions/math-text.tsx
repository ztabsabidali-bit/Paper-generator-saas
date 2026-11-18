import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { normalizeMathText } from "@/lib/math/normalize";
import { cn } from "@/lib/utils";
import type { TextDirection } from "@/types/database";

const REMARK_PLUGINS = [remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

/**
 * Bilingual questions are stored as LTR, but a single question can hold both an
 * English instruction and an Urdu sentence. Letting every block pick its own
 * base direction from its first strong character keeps each line aligned to its
 * own script — Urdu lines land on the right without turning the whole question
 * RTL.
 *
 * RTL questions skip this: their direction is already correct, and an
 * auto-detected math-only paragraph would otherwise snap back to the left.
 */
const AUTO_DIRECTION_COMPONENTS: Components = {
  p: ({ node: _node, ...props }) => <p {...props} dir="auto" />,
  li: ({ node: _node, ...props }) => <li {...props} dir="auto" />,
  blockquote: ({ node: _node, ...props }) => <blockquote {...props} dir="auto" />,
  h1: ({ node: _node, ...props }) => <h1 {...props} dir="auto" />,
  h2: ({ node: _node, ...props }) => <h2 {...props} dir="auto" />,
  h3: ({ node: _node, ...props }) => <h3 {...props} dir="auto" />,
  h4: ({ node: _node, ...props }) => <h4 {...props} dir="auto" />,
  h5: ({ node: _node, ...props }) => <h5 {...props} dir="auto" />,
  h6: ({ node: _node, ...props }) => <h6 {...props} dir="auto" />,
};

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
  const isRtl = direction === "rtl";

  return (
    <div
      dir={direction}
      lang={isRtl ? "ur" : "en"}
      className={cn(
        "question-prose",
        isRtl && "text-right text-urdu",
        compact && "text-[13px] leading-relaxed",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={isRtl ? undefined : AUTO_DIRECTION_COMPONENTS}
      >
        {normalizeMathText(content)}
      </ReactMarkdown>
    </div>
  );
}
