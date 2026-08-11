describe("env config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("throws when DATABASE_CONNECTION_STRING is missing", async () => {
    delete process.env.DATABASE_CONNECTION_STRING;
    process.env.QDRANT_URL = "http://localhost:6333";
    process.env.OPENAI_API_KEY = "sk-test";

    await expect(import("../env")).rejects.toThrow("connectionString missing");
  });

  it("throws when QDRANT_URL is missing", async () => {
    process.env.DATABASE_CONNECTION_STRING = "postgres://localhost/test";
    delete process.env.QDRANT_URL;
    process.env.OPENAI_API_KEY = "sk-test";

    await expect(import("../env")).rejects.toThrow("qdrantUrl missing");
  });

  it("throws when OPENAI_API_KEY is missing", async () => {
    process.env.DATABASE_CONNECTION_STRING = "postgres://localhost/test";
    process.env.QDRANT_URL = "http://localhost:6333";
    delete process.env.OPENAI_API_KEY;

    await expect(import("../env")).rejects.toThrow("openaiApiKey missing");
  });

  it("parses config correctly when all env vars are set", async () => {
    process.env.DATABASE_CONNECTION_STRING = "postgres://localhost/test";
    process.env.QDRANT_URL = "http://localhost:6333";
    process.env.OPENAI_API_KEY = "sk-test";

    const { config } = await import("../env");
    expect(config.connectionString).toBe("postgres://localhost/test");
    expect(config.qdrantUrl).toBe("http://localhost:6333");
    expect(config.openaiApiKey).toBe("sk-test");
  });

  it("uses defaults for optional values", async () => {
    process.env.DATABASE_CONNECTION_STRING = "postgres://localhost/test";
    process.env.QDRANT_URL = "http://localhost:6333";
    process.env.OPENAI_API_KEY = "sk-test";

    const { config } = await import("../env");
    expect(config.maxPackages).toBe(10000);
    expect(config.embeddingBatchSize).toBe(100);
    expect(config.openaiEmbeddingModel).toBe("text-embedding-3-small");
  });
});
