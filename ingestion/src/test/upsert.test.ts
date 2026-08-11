import type { EmbeddedPackage } from "../embed";

// ts-jest does not hoist jest.mock, so top-level const mocks are in scope
// inside the factories (same pattern as embed.test.ts)

const mockUpsert = jest.fn().mockResolvedValue(undefined);
const mockGetCollections = jest.fn().mockResolvedValue({
  collections: [{ name: "npmatch" }],
});
const mockCreateCollection = jest.fn().mockResolvedValue(undefined);
const mockQuery = jest.fn().mockResolvedValue(undefined);
const mockEnd = jest.fn().mockResolvedValue(undefined);

jest.mock("@qdrant/js-client-rest", () => ({
  QdrantClient: jest.fn().mockImplementation(() => ({
    getCollections: mockGetCollections,
    createCollection: mockCreateCollection,
    upsert: mockUpsert,
  })),
}));

jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockQuery,
    end: mockEnd,
  })),
}));

import { upsertPackages } from "../upsert";

describe("upsertPackages", () => {
  const embedded: EmbeddedPackage[] = [
    {
      pkg: { name: "react", description: "UI lib", keywords: ["ui"], version: "18.0.0" },
      vector: [0.1, 0.2, 0.3],
    },
    {
      pkg: { name: "lodash", description: "Utils", keywords: ["util"], version: "4.0.0" },
      vector: [0.4, 0.5, 0.6],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCollections.mockResolvedValue({
      collections: [{ name: "npmatch" }],
    });
  });

  it("ensures collection and table exist", async () => {
    await upsertPackages(embedded);

    expect(mockGetCollections).toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE IF NOT EXISTS"));
  });

  it("creates Qdrant collection if it does not exist", async () => {
    mockGetCollections.mockResolvedValueOnce({ collections: [] });

    await upsertPackages(embedded);

    expect(mockCreateCollection).toHaveBeenCalledWith("npmatch", {
      vectors: { size: 1536, distance: "Cosine" },
    });
  });

  it("skips collection creation if it already exists", async () => {
    await upsertPackages(embedded);

    expect(mockCreateCollection).not.toHaveBeenCalled();
  });

  it("upserts to both Qdrant and Postgres", async () => {
    await upsertPackages(embedded);

    expect(mockUpsert).toHaveBeenCalled();
    const qdrantCall = mockUpsert.mock.calls[0];
    expect(qdrantCall[0]).toBe("npmatch");
    expect(qdrantCall[1].points).toHaveLength(2);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO packages"),
      expect.any(Array),
    );
  });

  it("closes the pool after upserting", async () => {
    await upsertPackages(embedded);

    expect(mockEnd).toHaveBeenCalled();
  });
});
