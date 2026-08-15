import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PageTracker } from "../PageTracker";

describe("PageTracker", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
  });

  it("renders nothing", () => {
    const { container } = render(<PageTracker />);
    expect(container).toBeEmptyDOMElement();
  });

  it("posts a pageview to the tracking route on mount", async () => {
    const fetchMock = global.fetch as jest.Mock;

    render(<PageTracker />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/track/pageview");
    expect(opts.method).toBe("POST");
    expect(opts.keepalive).toBe(true);
    expect(JSON.parse(opts.body)).toEqual({ referrer: "" });
  });
});
