import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import AnalyticsPage from "../../app/analytics/page";
import { fetchAnalytics } from "@/lib/analytics";
import type { AnalyticsData } from "@/types";

jest.mock("@/lib/analytics", () => ({
  fetchAnalytics: jest.fn(),
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
    mockFetchAnalytics.mockResolvedValue(mockData);

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

  it("renders the dashboard directly when a token is already stored", async () => {
    window.sessionStorage.setItem(TOKEN_KEY, "stored-token");
    mockFetchAnalytics.mockResolvedValue(mockData);

    render(<AnalyticsPage />);

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(mockFetchAnalytics).toHaveBeenCalledWith("stored-token");
  });

  it("shows an error message when the token is wrong", async () => {
    const user = userEvent.setup();
    mockFetchAnalytics.mockRejectedValue(new Error("401"));

    render(<AnalyticsPage />);
    const input = await screen.findByLabelText("Analytics token");
    await user.type(input, "wrong");
    await user.click(screen.getByRole("button", { name: /Unlock/i }));

    expect(
      await screen.findByText(/Wrong token or analytics backend unreachable/i)
    ).toBeInTheDocument();
  });
});
