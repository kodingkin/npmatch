import type { EmbeddedPackage } from "../embed";

// Define mock functions INSIDE the jest.mock factory so they're accessible
// (jest.mock is hoisted, so external const references fail)

let mockUpsert: jest.Mock;
let mockGetCollections: jest.Mock;
let mockCreateCollection: jest.Mock;
let mockQuery: jest.Mock;
let mockEnd: jest.Mock;

function initMocks() {
  mockUpsert = jest.fn().mockResolvedValue(undefined);
  mockGetCollections = jest.fn().mockResolvedValue({
    collections: [{ name: "npmatch" }],
  });
  mockCreateCollection = jest.fn().mockResolvedValue(undefined);
  mockQuery = jest.fn().mockResolvedValue(undefined);
  mockEnd = jest.fn().mockResolvedValue(undefined);
}

jest.mock("@qdrant/js-client-rest", () => {
  initMocks();
  return {
    QdrantClient: jest.fn().mockImplementation(() => ({
      getCollections: mockGetCollections,
      createCollection: mockCreateCollection,
      upsert: mockUpsert,
    })),
  };
});

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
