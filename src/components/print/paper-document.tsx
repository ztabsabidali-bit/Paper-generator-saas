import { correctOptionLabel, resolveOptions } from "@/lib/papers/answer-key";
import { resolvePrintOptions } from "@/lib/papers/print-options";
import { MathText } from "@/components/questions/math-text";
import type {
  InstitutionSettings,
  Paper,
  PaperQuestionRow,
  PaperSet,
  Subject,
} from "@/types/domain";

type PrintPaper = Paper & { subject: Subject | null };

function groupSections(items: PaperQuestionRow[]) {
  const groups = new Map<string, PaperQuestionRow[]>();
  items.forEach((item) => {
    const key = item.section ?? "Questions";
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  });
  return [...groups.entries()];
}

export function PaperDocument({
  paper,
  set,
  institution,
}: {
  paper: PrintPaper;
  set: PaperSet & { items: PaperQuestionRow[] };
  institution: InstitutionSettings;
}) {
  const sections = groupSections(set.items);
  const options = resolvePrintOptions(paper.print_options);
  let questionNumber = 0;

  const footerParts = [
    options.set_label ? `Set ${set.set_label}` : null,
    options.title ? paper.title : null,
  ].filter((part): part is string => Boolean(part));

  return (
    <article className="paper-sheet">
      <header className="border-b-2 border-slate-900 pb-3">
        <div className="flex items-center gap-4">
          {institution.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={institution.logo_url}
              alt=""
              className="h-12 w-12 shrink-0 object-contain sm:h-16 sm:w-16"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[9px] font-semibold uppercase text-slate-400 sm:h-16 sm:w-16 sm:text-[10px]">
              Logo
            </div>
          )}

          <div className="min-w-0 flex-1 text-center">
            <h1 className="text-[15px] font-bold uppercase leading-tight tracking-wide text-slate-900 sm:text-[19px]">
              {institution.name}
            </h1>
            {institution.tagline ? (
              <p className="text-[11px] italic text-slate-600">{institution.tagline}</p>
            ) : null}
            {institution.address ? (
              <p className="text-[10px] text-slate-500">{institution.address}</p>
            ) : null}
          </div>

          {options.set_label ? (
            <div className="w-12 shrink-0 text-right sm:w-16">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Set</p>
              <p className="text-xl font-bold leading-none text-slate-900 sm:text-2xl">
                {set.set_label}
              </p>
            </div>
          ) : (
            <div className="w-12 shrink-0 sm:w-16" aria-hidden />
          )}
        </div>
      </header>

      {options.title || (options.session && paper.exam_session) ? (
        <div className="mt-3 text-center">
          {options.title ? (
            <h2 className="text-sm font-semibold text-slate-900">{paper.title}</h2>
          ) : null}
          {options.session && paper.exam_session ? (
            <p className="text-[11px] text-slate-600">Session {paper.exam_session}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-2 border-y border-slate-200 py-2 text-[11px] text-slate-700 sm:grid-cols-4 print:grid-cols-4">
        <div>
          <span className="text-slate-500">Class: </span>
          {paper.class_name || "—"}
        </div>
        <div>
          <span className="text-slate-500">Subject: </span>
          {paper.subject?.subject_name ?? "—"}
        </div>
        {options.duration ? (
          <div>
            <span className="text-slate-500">Time: </span>
            {paper.duration_minutes} min
          </div>
        ) : null}
        <div>
          <span className="text-slate-500">Total marks: </span>
          {paper.total_marks}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] text-slate-700 sm:grid-cols-3 sm:gap-4 print:grid-cols-3">
        <div className="flex items-end gap-1">
          <span className="whitespace-nowrap">Student name:</span>
          <span className="flex-1 border-b border-dotted border-slate-400" />
        </div>
        <div className="flex items-end gap-1">
          <span className="whitespace-nowrap">Roll no:</span>
          <span className="flex-1 border-b border-dotted border-slate-400" />
        </div>
        <div className="flex items-end gap-1">
          <span className="whitespace-nowrap">Section:</span>
          <span className="flex-1 border-b border-dotted border-slate-400" />
        </div>
      </div>

      {options.instructions && paper.instructions ? (
        <div className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Instructions
          </p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-[11px] leading-relaxed text-slate-700">
            {paper.instructions
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => (
                <li key={line}>{line}</li>
              ))}
          </ol>
        </div>
      ) : null}

      <div className="mt-5 space-y-5">
        {sections.map(([section, items]) => {
          const sectionMarks = items.reduce(
            (sum, item) => sum + (item.marks_override ?? item.question?.marks ?? 0),
            0,
          );
          return (
            <section key={section}>
              <div className="print-section-heading mb-2 flex items-baseline justify-between border-b border-slate-300 pb-1">
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-slate-900">
                  {section}
                </h3>
                <span className="text-[10px] text-slate-600">
                  {items.length} × {(sectionMarks / Math.max(items.length, 1)).toFixed(0)} ={" "}
                  {sectionMarks} marks
                </span>
              </div>

              <ol className="space-y-3">
                {items.map((item) => {
                  questionNumber += 1;
                  const question = item.question;
                  if (!question) return null;
                  const options = resolveOptions(question, item.option_order);
                  const marks = item.marks_override ?? question.marks;

                  return (
                    <li key={item.id} className="question-block flex gap-2 text-[12px]">
                      <span className="w-5 shrink-0 font-semibold text-slate-800">
                        {questionNumber}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <MathText
                          content={question.question_text}
                          direction={question.text_direction}
                          className="text-[12px] leading-relaxed"
                        />

                        {options.length > 0 ? (
                          <div className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 print:grid-cols-2">
                            {options.map((option) => (
                              <div key={option.key} className="flex gap-1.5 text-[11.5px]">
                                <span className="font-medium text-slate-500">
                                  {option.label}.
                                </span>
                                <MathText
                                  content={option.text}
                                  direction={question.text_direction}
                                  className="text-[11.5px] leading-relaxed"
                                />
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <span className="w-7 shrink-0 text-right text-[10px] text-slate-500">
                        ({marks})
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-1 border-t border-slate-200 pt-2 text-[9px] text-slate-500">
        <span>{institution.footer_note ?? ""}</span>
        {footerParts.length > 0 ? <span>{footerParts.join(" · ")}</span> : null}
      </footer>
    </article>
  );
}

export function AnswerKeyDocument({
  paper,
  set,
  institution,
}: {
  paper: PrintPaper;
  set: PaperSet & { items: PaperQuestionRow[] };
  institution: InstitutionSettings;
}) {
  return (
    <article className="paper-sheet print-answer-key">
      <header className="border-b-2 border-slate-900 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Confidential — for examiners
            </p>
            <h1 className="mt-1 text-[17px] font-bold uppercase tracking-wide text-slate-900">
              Answer key
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-600">
              {institution.name} · {paper.title}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Set</p>
            <p className="text-2xl font-bold leading-none text-slate-900">{set.set_label}</p>
            <p className="mt-1 text-[10px] text-slate-500">{paper.total_marks} marks</p>
          </div>
        </div>
      </header>

      <table className="mt-4 w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-slate-300 text-left">
            <th className="w-10 py-1.5 font-semibold text-slate-600">Q#</th>
            <th className="w-16 py-1.5 font-semibold text-slate-600">Type</th>
            <th className="py-1.5 font-semibold text-slate-600">Answer / marking points</th>
            <th className="w-14 py-1.5 text-right font-semibold text-slate-600">Marks</th>
          </tr>
        </thead>
        <tbody>
          {set.items.map((item) => {
            const question = item.question;
            const marks = item.marks_override ?? question?.marks ?? 0;
            const label = question ? correctOptionLabel(question, item.option_order) : null;
            const resolved = question ? resolveOptions(question, item.option_order) : [];
            const correct = resolved.find((option) => option.isCorrect);

            return (
              <tr key={item.id} className="border-b border-slate-100 align-top">
                <td className="py-1.5 font-medium text-slate-700">{item.display_order}</td>
                <td className="py-1.5 text-slate-500">
                  {question?.question_type === "mcq"
                    ? "MCQ"
                    : question?.question_type === "short"
                      ? "Short"
                      : "Long"}
                </td>
                <td className="py-1.5 pr-3 text-slate-800">
                  {label ? (
                    <div className="flex gap-1.5">
                      <span className="font-semibold">{label}.</span>
                      {correct ? (
                        <MathText
                          content={correct.text}
                          direction={question?.text_direction ?? "ltr"}
                          className="text-[11px] leading-relaxed"
                        />
                      ) : null}
                    </div>
                  ) : question?.correct_answer ? (
                    <MathText
                      content={question.correct_answer}
                      direction={question.text_direction}
                      className="text-[11px] leading-relaxed"
                    />
                  ) : (
                    <span className="text-slate-400">Not provided</span>
                  )}
                </td>
                <td className="py-1.5 text-right text-slate-600">{marks}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <footer className="mt-6 flex flex-wrap items-center justify-between gap-1 border-t border-slate-200 pt-2 text-[9px] text-slate-500">
        <span>Generated by PaperForge · seed {paper.seed}</span>
        <span>
          Set {set.set_label} · {paper.class_name}
        </span>
      </footer>
    </article>
  );
}
