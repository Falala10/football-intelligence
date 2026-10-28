import { expect, it } from "vitest";
import { publicAnswerText } from "./public-text";
it("removes leaked research IDs without hiding quotes, natural uncertainty or source links", () => {
  expect(publicAnswerText('He said "we weren’t fresh enough" [lookup-3].')).toBe('He said "we weren’t fresh enough".');
  expect(publicAnswerText('Report [lookup-2, lookup-3]. I could not verify the rest.')).toBe('Report. I could not verify the rest.');
  expect(publicAnswerText('[Read the report](https://example.com/report)')).toBe('[Read the report](https://example.com/report)');
});
