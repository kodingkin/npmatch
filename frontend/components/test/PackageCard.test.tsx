import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PackageCard, PackageCardSkeleton } from "../PackageCard";

const mockPkg = {
  name: "react",
  version: "18.2.0",
  description: "A JavaScript library for building user interfaces",
  npm_url: "https://www.npmjs.com/package/react",
};

describe("PackageCard", () => {
  it("renders package name", () => {
    render(<PackageCard pkg={mockPkg} index={0} />);
    expect(screen.getByText("react")).toBeInTheDocument();
  });

  it("renders version", () => {
    render(<PackageCard pkg={mockPkg} index={0} />);
    expect(screen.getByText("v18.2.0")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<PackageCard pkg={mockPkg} index={0} />);
    expect(
      screen.getByText("A JavaScript library for building user interfaces")
    ).toBeInTheDocument();
  });

  it("renders npm link with correct href", () => {
    render(<PackageCard pkg={mockPkg} index={0} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "https://www.npmjs.com/package/react"
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("applies animation delay style", () => {
    const { container } = render(<PackageCard pkg={mockPkg} index={2} />);
    const link = container.firstChild as HTMLElement;
    const card = link.firstChild as HTMLElement;
    expect(card).toHaveStyle("animation-delay: 120ms");
  });

  describe("highlighted", () => {
    it("shows AI pick badge when highlighted", () => {
      render(<PackageCard pkg={mockPkg} index={0} highlighted />);
      expect(screen.getByText("AI pick")).toBeInTheDocument();
    });

    it("does not show AI pick badge when not highlighted", () => {
      render(<PackageCard pkg={mockPkg} index={0} />);
      expect(screen.queryByText("AI pick")).not.toBeInTheDocument();
    });

    it("applies highlighted border style", () => {
      const { container } = render(
        <PackageCard pkg={mockPkg} index={0} highlighted />
      );
      const link = container.firstChild as HTMLElement;
      const card = link.firstChild as HTMLElement;
      expect(card.className).toMatch(/(?:^|\s)border-npm-red\/40(?:\s|$)/);
    });

    it("uses default border when not highlighted", () => {
      const { container } = render(
        <PackageCard pkg={mockPkg} index={0} />
      );
      const link = container.firstChild as HTMLElement;
      const card = link.firstChild as HTMLElement;
      expect(card.className).toMatch(/(?:^|\s)border-white\/10(?:\s|$)/);
    });
  });
});

describe("PackageCardSkeleton", () => {
  it("renders skeleton blocks", () => {
    const { container } = render(<PackageCardSkeleton index={0} />);
    const skeletons = container.querySelectorAll(".skeleton-shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("applies animation delay", () => {
    const { container } = render(<PackageCardSkeleton index={3} />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveStyle("animation-delay: 240ms");
  });
});
