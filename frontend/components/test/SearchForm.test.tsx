import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { SearchForm } from "../SearchForm";

jest.mock("@/types", () => ({
  FRAMEWORK_OPTIONS: [
    { value: "react", label: "React" },
    { value: "none", label: "None" },
  ],
  PRIORITY_OPTIONS: ["size", "speed", "popularity"],
}));

describe("SearchForm", () => {
  it("calls onSearch when clicking search", async () => {
    const user = userEvent.setup();
    const onSearch = jest.fn();

    render(<SearchForm onSearch={onSearch} isLoading={false} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "test query");

    // Use getByRole with name instead of getByText to avoid matching helper text
    const searchButton = screen.getByRole("button", { name: /Search →/i });
    await user.click(searchButton);

    expect(onSearch).toHaveBeenCalledWith("test query", "none", []);
  });

  it("submits on Enter", async () => {
    const user = userEvent.setup();
    const onSearch = jest.fn();

    render(<SearchForm onSearch={onSearch} isLoading={false} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "hello");
    await user.keyboard("{Enter}");

    expect(onSearch).toHaveBeenCalled();
  });

  it("does not submit on Shift+Enter", async () => {
    const user = userEvent.setup();
    const onSearch = jest.fn();

    render(<SearchForm onSearch={onSearch} isLoading={false} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "hello");
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onSearch).not.toHaveBeenCalled();
  });

  it("toggles priority", async () => {
    const user = userEvent.setup();
    const onSearch = jest.fn();

    render(<SearchForm onSearch={onSearch} isLoading={false} />);

    // Click the "size" chip - more reliable than getByText
    const sizeChip = screen.getByText("size");
    await user.click(sizeChip);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "hello");

    const searchButton = screen.getByRole("button", { name: /Search →/i });
    await user.click(searchButton);

    expect(onSearch).toHaveBeenCalledWith("hello", "none", ["size"]);
  });

  it("shows spinner when loading", () => {
    render(<SearchForm onSearch={jest.fn()} isLoading />);

    // HeroUI Spinner usually contains an SVG with aria-label
    expect(screen.getByLabelText(/loading|searching/i)).toBeInTheDocument();
    
    // Alternative (if you add data-testid to Spinner in component):
    // expect(screen.getByTestId("search-spinner")).toBeInTheDocument();
  });
});