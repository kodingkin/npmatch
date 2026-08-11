import https from "https";
import { EventEmitter } from "events";

import { fetchPackages } from "../fetch";

jest.mock("https");

const mockHttpsGet = https.get as jest.MockedFunction<typeof https.get>;

function mockResponse(statusCode: number, data: unknown, location?: string) {
  const emitter = new EventEmitter();
  (emitter as any).statusCode = statusCode;
  (emitter as any).headers = location ? { location } : {};

  process.nextTick(() => {
    if (statusCode === 200) {
      const json = JSON.stringify(data);
      // Simulate streaming chunks
      const half = Math.floor(json.length / 2);
      emitter.emit("data", Buffer.from(json.slice(0, half)));
      emitter.emit("data", Buffer.from(json.slice(half)));
      emitter.emit("end");
    } else if (statusCode === 301 || statusCode === 302) {
      // Redirect — won't fire end on this response
    } else {
      emitter.emit("end");
    }
  });

  return emitter;
}

describe("fetchPackages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches and parses packages", async () => {
    mockHttpsGet.mockImplementationOnce((_url, cb: any) => {
      const res = mockResponse(200, [
        { name: "react", description: "A JS library", keywords: ["ui"], version: "18.0.0" },
        { name: "lodash", description: "Utility library", keywords: ["util"], version: "4.0.0" },
      ]);
      cb(res);
      return {} as any;
    });

    const result = await fetchPackages();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: "react",
      description: "A JS library",
      keywords: ["ui"],
      version: "18.0.0",
    });
  });

  it("filters out entries with no name", async () => {
    mockHttpsGet.mockImplementationOnce((_url, cb: any) => {
      const res = mockResponse(200, [
        { name: "", description: "no name", keywords: [] },
        { name: "valid", description: "has name", keywords: [] },
      ]);
      cb(res);
      return {} as any;
    });

    const result = await fetchPackages();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("valid");
  });

  it("filters out entries with empty description", async () => {
    mockHttpsGet.mockImplementationOnce((_url, cb: any) => {
      const res = mockResponse(200, [
        { name: "a", description: "   ", keywords: [] },
        { name: "b", description: null, keywords: [] },
        { name: "c", description: "good", keywords: [] },
      ]);
      cb(res);
      return {} as any;
    });

    const result = await fetchPackages();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("c");
  });

  it("deduplicates by name", async () => {
    mockHttpsGet.mockImplementationOnce((_url, cb: any) => {
      const res = mockResponse(200, [
        { name: "dup", description: "first", keywords: [] },
        { name: "dup", description: "second", keywords: [] },
      ]);
      cb(res);
      return {} as any;
    });

    const result = await fetchPackages();
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("first");
  });

  it("defaults keywords to empty array when not an array", async () => {
    mockHttpsGet.mockImplementationOnce((_url, cb: any) => {
      const res = mockResponse(200, [
        { name: "pkg", description: "desc", version: "1.0" },
      ]);
      cb(res);
      return {} as any;
    });

    const result = await fetchPackages();
    expect(result[0].keywords).toEqual([]);
  });

  it("defaults version to 'unknown'", async () => {
    mockHttpsGet.mockImplementationOnce((_url, cb: any) => {
      const res = mockResponse(200, [
        { name: "pkg", description: "desc", keywords: [] },
      ]);
      cb(res);
      return {} as any;
    });

    const result = await fetchPackages();
    expect(result[0].version).toBe("unknown");
  });

  it("rejects on non-200 status", async () => {
    mockHttpsGet.mockImplementationOnce((_url, cb: any) => {
      const res = mockResponse(500, null);
      cb(res);
      return {} as any;
    });

    await expect(fetchPackages()).rejects.toThrow("HTTP 500");
  });

  it("follows redirects", async () => {
    mockHttpsGet
      .mockImplementationOnce((_url, cb: any) => {
        const res = mockResponse(301, null, "https://example.com/final");
        cb(res);
        return {} as any;
      })
      .mockImplementationOnce((_url, cb: any) => {
        const res = mockResponse(200, [
          { name: "via-redirect", description: "desc", keywords: [] },
        ]);
        cb(res);
        return {} as any;
      });

    const result = await fetchPackages();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("via-redirect");
  });

  it("rejects on JSON parse error", async () => {
    mockHttpsGet.mockImplementationOnce((_url, cb: any) => {
      const emitter = new EventEmitter();
      (emitter as any).statusCode = 200;
      process.nextTick(() => {
        emitter.emit("data", Buffer.from("not json{{{"));
        emitter.emit("end");
      });
      cb(emitter);
      return {} as any;
    });

    await expect(fetchPackages()).rejects.toThrow();
  });
});
