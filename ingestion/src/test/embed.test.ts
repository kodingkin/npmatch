import type { NpmPackage } from "../fetch";

// Capture mock so we can inspect calls
const mockEmbeddingsCreate = jest.fn().mockResolvedValue({
  data: [
    { embedding: [0.1, 0.2, 0.3] },
    { embedding: [0.4, 0.5, 0.6] },
  ],
});

jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    embeddings: {
      create: mockEmbeddingsCreate,
    },
  }));
});

import { embedPackages } from "../embed";

describe("embedPackages", () => {
  const samplePackages: NpmPackage[] = [
    { name: "react", description: "UI library", keywords: ["frontend"], version: "18.0.0" },
    { name: "lodash", description: "Utils", keywords: ["util"], version: "4.0.0" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockEmbeddingsCreate.mockResolvedValue({
      data: [
        { embedding: [0.1, 0.2, 0.3] },
        { embedding: [0.4, 0.5, 0.6] },
      ],
    });
  });

  it("embeds packages and returns vectors", async () => {
    const result = await embedPackages(samplePackages);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      pkg: samplePackages[0],
      vector: [0.1, 0.2, 0.3],
    });
    expect(result[1]).toEqual({
      pkg: samplePackages[1],
      vector: [0.4, 0.5, 0.6],
    });
  });

  it("builds embedding text from name, description, and keywords", async () => {
    await embedPackages(samplePackages);

    expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
      model: expect.any(String),
      input: [
        "react: UI library. keywords: frontend",
        "lodash: Utils. keywords: util",
      ],
    });
  });

  it("handles packages without keywords", async () => {
    const pkg: NpmPackage = {
      name: "simple",
      description: "simple desc",
      keywords: [],
      version: "1.0",
    };

    mockEmbeddingsCreate.mockResolvedValueOnce({
      data: [{ embedding: [0.1] }],
    });

    await embedPackages([pkg]);

    expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
      model: expect.any(String),
      input: ["simple: simple desc. keywords: "],
    });
  });
});
