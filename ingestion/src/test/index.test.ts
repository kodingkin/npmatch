jest.mock("../fetch", () => ({
  fetchPackages: jest.fn().mockResolvedValue([
    { name: "pkg", description: "desc", keywords: [], version: "1.0" },
  ]),
}));

jest.mock("../embed", () => ({
  embedPackages: jest.fn().mockResolvedValue([
    { pkg: { name: "pkg", description: "desc", keywords: [], version: "1.0" }, vector: [0.1] },
  ]),
}));

jest.mock("../upsert", () => ({
  upsertPackages: jest.fn().mockResolvedValue(undefined),
}));

// Prevent process.exit from killing the test runner
const mockExit = jest.spyOn(process, "exit").mockImplementation((() => {}) as any);

describe("index pipeline", () => {
  afterAll(() => {
    mockExit.mockRestore();
  });

  it("calls fetch, embed, and upsert in sequence", async () => {
    // Import index.ts to exercise the real pipeline orchestration
    await import("../index");

    const { fetchPackages } = await import("../fetch");
    const { embedPackages } = await import("../embed");
    const { upsertPackages } = await import("../upsert");

    expect(fetchPackages).toHaveBeenCalled();
    expect(embedPackages).toHaveBeenCalled();
    expect(upsertPackages).toHaveBeenCalled();

    // Verify call order
    const fetchOrder = (fetchPackages as jest.Mock).mock.invocationCallOrder[0];
    const embedOrder = (embedPackages as jest.Mock).mock.invocationCallOrder[0];
    const upsertOrder = (upsertPackages as jest.Mock).mock.invocationCallOrder[0];
    expect(fetchOrder).toBeLessThan(embedOrder);
    expect(embedOrder).toBeLessThan(upsertOrder);

    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("exits with code 1 on failure", async () => {
    // Need to reset modules so main() runs again with a fresh mock
    jest.resetModules();

    jest.mock("../fetch", () => ({
      fetchPackages: jest.fn().mockRejectedValue(new Error("network error")),
    }));
    jest.mock("../embed", () => ({
      embedPackages: jest.fn(),
    }));
    jest.mock("../upsert", () => ({
      upsertPackages: jest.fn(),
    }));

    await import("../index");

    // Wait for the rejected promise microtask
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
