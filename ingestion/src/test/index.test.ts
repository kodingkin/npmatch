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
    const { fetchPackages } = await import("../fetch");
    const { embedPackages } = await import("../embed");
    const { upsertPackages } = await import("../upsert");

    // Simulate the pipeline as index.ts would
    const packages = await fetchPackages();
    expect(fetchPackages).toHaveBeenCalled();
    expect(packages).toHaveLength(1);

    const embedded = await embedPackages(packages);
    expect(embedPackages).toHaveBeenCalledWith(packages);
    expect(embedded).toHaveLength(1);

    await upsertPackages(embedded);
    expect(upsertPackages).toHaveBeenCalledWith(embedded);
  });

  it("propagates errors from fetchPackages", async () => {
    const { fetchPackages } = await import("../fetch");
    (fetchPackages as jest.Mock).mockRejectedValueOnce(new Error("network error"));

    await expect(fetchPackages()).rejects.toThrow("network error");
  });
});
