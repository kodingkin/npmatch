import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import AnalyticsPage from "../../app/analytics/page";
import { fetchAnalytics } from "@/lib/analytics";
import type { AnalyticsData, AnalyticsResult } from "@/types";

jest.mock("@/lib/analytics", () => ({
  fetchAnalytics: jest.fn(),
  analyticsErrorMessage: jest.fn(
    (status: number | null) =>
      status === 401 ? "Wrong token." : "Analytics backend unreachable."
  ),
}));

const mockFetchAnalytics = fetchAnalytics as jest.Mock;

const TOKEN_KEY = "npmatch.analytics.token";

const mockData: AnalyticsData = {
  summary: {
    total_visits: 42,
    unique_visitors: 7,
    total_searches: 13,
    visits_last_24h: 3,
    searches_last_24h: 1,
    top_queries: [{ label: "react", count: 4 }],
    top_frameworks: [{ label: "react", count: 3 }],
    top_referrers: [{ label: "(direct)", count: 2 }],
  },
  visits: [
    {
      visited_at: "2026-08-11T10:00:00Z",
      ip_hash: "a1b2c3d4e5f6",
      user_agent: "Mozilla/5.0",
      referrer: "https://example.com/ref",
    },
  ],
  searches: [
    {
      searched_at: "2026-08-11T10:00:00Z",
      query: "react",
      framework: "react",
      priorities: ["bundle size"],
      result_count: 5,
    },
  ],
};

function okResult(): AnalyticsResult {
  return {
    summary: mockData.summary,
    visits: mockData.visits,
    searches: mockData.searches,
    errors: {},
  };
}

describe("AnalyticsPage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    jest.clearAllMocks();
  });

  it("shows the gate form when no token is stored", async () => {
    render(<AnalyticsPage />);
    expect(await screen.findByLabelText("Analytics token")).toBeInTheDocument();
    expect(screen.getByText(/Enter your analytics token/i)).toBeInTheDocument();
    expect(mockFetchAnalytics).not.toHaveBeenCalled();
  });

  it("unlocks with a token and renders the dashboard", async () => {
    const user = userEvent.setup();
    mockFetchAnalytics.mockResolvedValue(okResult());

    render(<AnalyticsPage />);
    const input = await screen.findByLabelText("Analytics token");
    await user.type(input, "secret");
    await user.click(screen.getByRole("button", { name: /Unlock/i }));

    expect(mockFetchAnalytics).toHaveBeenCalledWith("secret");

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Top queries")).toBeInTheDocument();
    expect(screen.getByText("Recent visitors")).toBeInTheDocument();
    expect(screen.getByText("a1b2c3d4…")).toBeInTheDocument();
    expect(screen.getByText("Recent searches")).toBeInTheDocument();
    expect(screen.getAllByText("react").length).toBeGreaterThan(0);
  });

  it("persists a validated token to sessionStorage", async () => {
    const user = userEvent.setup();
    mockFetchAnalytics.mockResolvedValue(okResult());

    render(<AnalyticsPage />);
    const input = await screen.findByLabelText("Analytics token");
    await user.type(input, "secret");
    await user.click(screen.getByRole("button", { name: /Unlock/i }));

    await screen.findByText("42");
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBe("secret");
  });

  it("renders the dashboard directly when a token is already stored", async () => {
    window.sessionStorage.setItem(TOKEN_KEY, "stored-token");
    mockFetchAnalytics.mockResolvedValue(okResult());

    render(<AnalyticsPage />);

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(mockFetchAnalytics).toHaveBeenCalledWith("stored-token");
  });

  it("shows a distinct wrong-token error and does not persist a bad token", async () => {
    const user = userEvent.setup();
    mockFetchAnalytics.mockResolvedValue({
      summary: null,
      visits: null,
      searches: null,
      errors: { summary: 401, visits: 401, searches: 401 },
    });

    render(<AnalyticsPage />);
    const input = await screen.findByLabelText("Analytics token");
    await user.type(input, "wrong");
    await user.click(screen.getByRole("button", { name: /Unlock/i }));

    expect(await screen.findByText("Wrong token.")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("shows a backend-unreachable error for a 5xx summary failure", async () => {
    const user = userEvent.setup();
    mockFetchAnalytics.mockResolvedValue({
      summary: null,
      visits: null,
      searches: null,
      errors: { summary: 502, visits: 502, searches: 502 },
    });

    render(<AnalyticsPage />);
    const input = await screen.findByLabelText("Analytics token");
    await user.type(input, "secret");
    await user.click(screen.getByRole("button", { name: /Unlock/i }));

    expect(
      await screen.findByText("Analytics backend unreachable.")
    ).toBeInTheDocument();
  });

  it("clears a stored token that comes back 401", async () => {
    window.sessionStorage.setItem(TOKEN_KEY, "stale-token");
    mockFetchAnalytics.mockResolvedValue({
      summary: null,
      visits: null,
      searches: null,
      errors: { summary: 401, visits: 401, searches: 401 },
    });

    render(<AnalyticsPage />);

    expect(await screen.findByText("Wrong token.")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("degrades gracefully when only the searches endpoint fails", async () => {
    const user = userEvent.setup();
    mockFetchAnalytics.mockResolvedValue({
      summary: mockData.summary,
      visits: mockData.visits,
      searches: null,
      errors: { searches: 502 },
    });

    render(<AnalyticsPage />);
    const input = await screen.findByLabelText("Analytics token");
    await user.type(input, "secret");
    await user.click(screen.getByRole("button", { name: /Unlock/i }));

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(screen.getByText("Recent visitors")).toBeInTheDocument();
    expect(screen.getByText("a1b2c3d4…")).toBeInTheDocument();
    expect(
      screen.getByText(/Failed to load recent searches/)
    ).toBeInTheDocument();
    expect(screen.queryByText("No searches yet")).not.toBeInTheDocument();
  });
});
