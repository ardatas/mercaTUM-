import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { QuoteReview } from "../src/client/components/ui/quote-review";
import { defaultSelection } from "../src/shared/marketplace";
import { previewQuote } from "./fixtures/quote";
import type { PublicQuote } from "../src/shared/contracts";

function render(
  quote: PublicQuote,
  selection = defaultSelection("mistral-pro"),
) {
  return renderToStaticMarkup(
    createElement(QuoteReview, {
      quote,
      selection,
      busy: false,
      onApprove: () => {},
      onRefresh: () => {},
      onCancel: () => {},
    }),
  );
}
describe("purchase review", () => {
  it("shows saved chat selection alongside the actual execution model", () => {
    const html = render(previewQuote());
    expect(html).toContain("Mistral Large 4");
    expect(html).toContain("medium");
    expect(html).toContain("<dt>Runs on</dt>");
    expect(html).toContain("gemini-3.8-flash");
    const matching = render(previewQuote(), defaultSelection("gemini-ultra"));
    expect(matching).toContain("Gemini 3.8 Flash");
    expect(matching).not.toContain("Runs on");
  });
  it("defaults to 5000 sats without consenting or changing the service price", () => {
    const html = render(previewQuote());
    expect(html).toContain('value="5000"');
    expect(html).toContain("<strong>100 sats</strong>");
    expect(html).toMatch(/type="checkbox"(?![^>]*checked)/);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Approve 100 sats/);
    expect(html).toContain('max="1000000"');
    expect(html).toContain('class="quote-terms"');
    expect(html).toContain("Additional scope requires a separate purchase");
  });
  it("never defaults below the service price and keeps expired quotes blocked", () => {
    expect(render({ ...previewQuote(), priceSats: 6000 })).toContain(
      'value="6000"',
    );
    const html = render({
      ...previewQuote(),
      expiresAt: "2020-01-01T00:00:00Z",
    });
    expect(html).toContain("Refresh quote");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Quote expired/);
  });
  it("keeps the actual model for legacy tasks without a catalog selection", () => {
    const html = renderToStaticMarkup(
      createElement(QuoteReview, {
        quote: previewQuote(),
        busy: false,
        onApprove: () => {},
        onRefresh: () => {},
        onCancel: () => {},
      }),
    );
    expect(html).toContain("<dt>Model</dt><dd>gemini-3.8-flash</dd>");
  });
});
