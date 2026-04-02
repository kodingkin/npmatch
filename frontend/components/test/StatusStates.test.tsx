import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EmptyState, ErrorState } from "../StatusStates";

describe("EmptyState", () => {
  it("renders empty state text", () => {
    render(<EmptyState onReset={jest.fn()} />);

    expect(screen.getByText("No packages found")).toBeInTheDocument();
    expect(
      screen.getByText(/Try rephrasing your query/i)
    ).toBeInTheDocument();
  });

  it("calls onReset when clicking Try again", () => {
    const onReset = jest.fn();
    render(<EmptyState onReset={onReset} />);

    fireEvent.click(screen.getByText("Try again"));

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe("ErrorState", () => {
  it("renders error message", () => {
    render(
      <ErrorState message="Something went wrong" onReset={jest.fn()} />
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("calls onReset when clicking Retry", () => {
    const onReset = jest.fn();
    render(
      <ErrorState message="Error" onReset={onReset} />
    );

    fireEvent.click(screen.getByText("Retry"));

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});