# PaperForge — AI CSV import brief

Reference file for AI agents that generate question files for PaperForge.
Give the agent this file (or paste the prompt at the end) together with the
class, subject, chapters and difficulty mix it should cover.

The output is imported at **Question bank → Import CSV** into one selected
subject. Every row in a file belongs to that subject.

## 1. Output contract

- Output **raw CSV only** — no Markdown fences, comments or preamble.
- UTF-8 encoding, comma delimiter, exactly one header row.
- One question per row. No merged cells, title rows or blank rows.
- Do **not** add `class` or `subject` columns; the importer ignores them.
  The subject is chosen in the app.
- Quote any field containing a comma, double quote or newline.
- Escape an inner double quote by doubling it (`""`).
- Wrap **every** expression in `$…$` (inline maths). For example
  `$x^2 - 5x + 6 = 0$`, `$\sqrt{3} + \sqrt{5}$` and
  `$\sqrt[4]{16x^4y^8}$`. Never leave bare `x^2` or `\sqrt{...}` outside
  `$…$`; the app renders only what is inside dollar signs.
- Maximum 500 rows and 2 MB per file.
- Do not emit duplicate questions. Duplicates already in the subject are
  skipped automatically.

## 2. Header

```csv
chapter,topic,subtopic,type,question_text,option_a,option_b,option_c,option_d,correct_answer,difficulty,marks,medium,direction,explanation
```

## 3. Example file

```csv
chapter,topic,subtopic,type,question_text,option_a,option_b,option_c,option_d,correct_answer,difficulty,marks,medium,direction,explanation
Chapter 1: Quadratic Equations,Solving by factorisation,,mcq,"The roots of $x^2 - 5x + 6 = 0$ are:","2 and 3","-2 and -3","1 and 6","-1 and -6",A,easy,1,english,ltr,"Factorise as $(x - 2)(x - 3) = 0$."
Chapter 1: Quadratic Equations,Solving by factorisation,,short,"Solve $x^2 - 7x + 12 = 0$ by factorisation.",,,,,,medium,3,english,ltr,"$x^2 - 7x + 12 = (x - 3)(x - 4)$, so $x = 3$ or $x = 4$."
Chapter 1: Quadratic Equations,The quadratic formula,,long,"Derive the quadratic formula from $ax^2 + bx + c = 0$, then use it to solve $2x^2 + 5x - 3 = 0$.",,,,,,hard,8,english,ltr,"Complete the square on $ax^2 + bx + c$, then substitute $a = 2$, $b = 5$ and $c = -3$."
Chapter 2: Matrices,Types of matrices,,mcq,"Which matrix has every element equal to zero?",Zero matrix,Identity matrix,Diagonal matrix,Row matrix,A,easy,1,english,ltr,"A zero matrix has all entries equal to $0$."
Chapter 2: Matrices,Matrix operations,,mcq,"What is 2 + 2?",3,4,,,B,easy,1,english,ltr,
Chapter 3: نظم,,,short,"غزل کی تعریف لکھیں۔",,,,,,medium,3,urdu,,"غزل اردو شاعری کی مقبول صنف ہے۔"
```

Notes on the examples:

- Rows 4–5 show MCQs with four and two options. Two options is the minimum.
- Row 6 uses `medium=urdu` and a blank `direction`; the importer applies RTL
  automatically.
- Short/long rows leave all option columns blank and may put the model answer
  in `correct_answer`.

## 4. Column reference

| Column | Required | Rules |
| --- | --- | --- |
| `chapter` | Yes | Max 200 characters. Matched case- and whitespace-insensitively. |
| `topic` | No | Max 200 characters. |
| `subtopic` | No | Max 200 characters. |
| `type` | Yes | `mcq`, `short` or `long`. |
| `question_text` | Yes | 3–10,000 characters. |
| `option_a` … `option_d` | MCQs | At least two non-empty options. Option E–H columns are also accepted in the raw file but are not part of the canonical template. |
| `correct_answer` | MCQs | Letter of a filled option (`A`–`H`) or the exact option text. For short/long, an optional model answer. |
| `difficulty` | No | `easy`, `medium` or `hard`. Blank → `medium`. |
| `marks` | No | Number greater than 0 and at most 100. Blank → 1 (MCQ), 3 (short), 8 (long). |
| `medium` | No | `english`, `urdu` or `bilingual`. Blank → `english`. |
| `direction` | No | `ltr` or `rtl`. Blank → inherited from `medium` (Urdu → RTL). |
| `explanation` | No | Max 10,000 characters. Working notes or rationale. |

Chapter matching: if a chapter/topic does not exist in the subject, an admin
can tick **Create missing chapters/topics** during import. A teacher cannot;
their rows must use existing chapters.

## 5. Copy-paste prompt for the agent

```text
Generate a PaperForge import CSV.

Output ONLY raw CSV text — no Markdown fences, no commentary.

Use exactly this header, in this order:
chapter,topic,subtopic,type,question_text,option_a,option_b,option_c,option_d,correct_answer,difficulty,marks,medium,direction,explanation

Rules:
- One question per row. UTF-8, comma-separated, RFC 4180.
- Quote fields containing commas, quotes, or newlines; double inner quotes.
- Do NOT add class or subject columns. The file targets one subject only.
- chapter is required; topic and subtopic are optional.
- type is mcq, short, or long.
- MCQ rows need at least option_a and option_b. correct_answer is the letter
  of the filled option (A–H) or the exact option text.
- short/long rows leave option_a..option_d blank; correct_answer is the model answer.
- marks: >0 and <=100; leave blank for defaults 1/3/8.
- difficulty: easy|medium|hard; leave blank for medium.
- medium: english|urdu|bilingual; leave blank for english.
- direction: leave blank to inherit from medium.
- explanation is optional.
- Wrap every expression in $…$: $x^2 - 5x + 6 = 0$, $\sqrt{3} + \sqrt{5}$,
  $\sqrt[4]{16x^4y^8}$. Never leave bare x^2 or \sqrt{...} outside $…$.
- No duplicate questions.
- Maximum 500 rows.

Generate [N] questions for this subject:
Class: [Class 9]
Subject: [Mathematics]
Chapters/topics: [list them]
Difficulty mix: [e.g. 40% easy, 40% medium, 20% hard]
Medium: [English]
```
