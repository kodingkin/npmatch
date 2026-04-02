import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { LlmPanel } from "../LlmPanel";

jest.mock('react-markdown', () => {
  return function MockMarkdown({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
});

describe("LlmPanel", () => {
  it("renders spinner when streaming and no text", () => {
    render(<LlmPanel text="" isStreaming={true} />);

    expect(
      screen.getByText("Generating recommendation…")
    ).toBeInTheDocument();
  });

  it("renders nothing when no text and not streaming", () => {
    const { container } = render(
      <LlmPanel text="" isStreaming={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders markdown content when text is provided', () => {
    render(<LlmPanel text="**Hello** world" isStreaming={false} />);
    
    const content = screen.getByText("**Hello** world");
    expect(content).toBeInTheDocument();
  });

  it("adds cursor-blink class when streaming with text", () => {
    const { container } = render(
      <LlmPanel text="Streaming text" isStreaming={true} />
    );

    const prose = container.querySelector(".prose-npm");
    expect(prose).toHaveClass("cursor-blink");
  });

  it("does not add cursor-blink class when not streaming", () => {
    const { container } = render(
      <LlmPanel text="Static text" isStreaming={false} />
    );

    const prose = container.querySelector(".prose-npm");
    expect(prose).not.toHaveClass("cursor-blink");
  });
});