import { describe, expect, it } from "vitest";
import { DEFAULT_PRINT_OPTIONS, resolvePrintOptions } from "./print-options";

describe("resolvePrintOptions", () => {
  it("prints every detail when nothing is stored", () => {
    expect(resolvePrintOptions(undefined)).toEqual(DEFAULT_PRINT_OPTIONS);
    expect(resolvePrintOptions(null)).toEqual(DEFAULT_PRINT_OPTIONS);
  });

  it("treats an empty object as all-on", () => {
    expect(resolvePrintOptions({})).toEqual(DEFAULT_PRINT_OPTIONS);
  });

  it("keeps explicit false flags", () => {
    expect(resolvePrintOptions({ title: false, instructions: false })).toEqual({
      ...DEFAULT_PRINT_OPTIONS,
      title: false,
      instructions: false,
    });
  });

  it("backfills missing keys while honouring stored ones", () => {
    expect(resolvePrintOptions({ duration: false })).toEqual({
      ...DEFAULT_PRINT_OPTIONS,
      duration: false,
    });
  });

  it("ignores values that are not booleans", () => {
    expect(resolvePrintOptions({ title: "no", duration: 0, set_label: null })).toEqual(
      DEFAULT_PRINT_OPTIONS,
    );
  });

  it("ignores arrays and scalars", () => {
    expect(resolvePrintOptions([false])).toEqual(DEFAULT_PRINT_OPTIONS);
    expect(resolvePrintOptions("title:false")).toEqual(DEFAULT_PRINT_OPTIONS);
  });

  it("adds page numbers but no watermark for papers saved before the keys existed", () => {
    const stored = { title: true, session: true, duration: true, set_label: true, instructions: true };
    expect(resolvePrintOptions(stored)).toEqual({
      ...stored,
      page_numbers: true,
      watermark: false,
    });
  });

  it("honours explicit page number and watermark choices", () => {
    expect(resolvePrintOptions({ page_numbers: false, watermark: true })).toEqual({
      ...DEFAULT_PRINT_OPTIONS,
      page_numbers: false,
      watermark: true,
    });
  });
});
