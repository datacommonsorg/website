import { getUpdatedHash } from "../url_utils";

describe("getUpdatedHash", () => {
  const originalHash = window.location.hash;

  beforeEach(() => {
    // Set up a default hash for each test
    window.location.hash = "#foo=bar&baz=qux&hl=en&enable_feature=1";
  });

  afterAll(() => {
    window.location.hash = originalHash;
  });

  test("updates single param and removes others", () => {
    const params = { foo: "newval" };
    const result = getUpdatedHash(params);
    // 'hl' and 'enable_feature' are persisted
    expect(result).toContain("foo=newval");
    expect(result).not.toContain("baz=qux");
    expect(result).toContain("hl=en");
    expect(result).toContain("enable_feature=1");
  });

  test("removes param if value is empty string", () => {
    const params = { foo: "" };
    const result = getUpdatedHash(params);
    expect(result).not.toContain("foo=");
    expect(result).toContain("hl=en");
    expect(result).toContain("enable_feature=1");
  });

  test("removes param if value is empty array", () => {
    const params = { foo: [] };
    const result = getUpdatedHash(params);
    expect(result).not.toContain("foo=");
    expect(result).toContain("hl=en");
    expect(result).toContain("enable_feature=1");
  });

  test("adds new param", () => {
    const params = { newparam: "val" };
    const result = getUpdatedHash(params);
    expect(result).toContain("newparam=val");
    expect(result).toContain("hl=en");
    expect(result).toContain("enable_feature=1");
    expect(result).not.toContain("foo=bar");
    expect(result).not.toContain("baz=qux");
  });

  test("handles array values", () => {
    const params = { foo: ["a", "b", "c"] };
    const result = getUpdatedHash(params);
    expect(result).toContain("foo=a");
    expect(result).toContain("foo=b");
    expect(result).toContain("foo=c");
    expect(result.match(/foo=/g)?.length).toBe(3);
    expect(result).toContain("hl=en");
    expect(result).toContain("enable_feature=1");
  });

  test("persists only PARAMS_TO_PERSIST", () => {
    const params = {};
    const result = getUpdatedHash(params);
    expect(result).toContain("hl=en");
    expect(result).toContain("enable_feature=1");
    expect(result).not.toContain("foo=bar");
    expect(result).not.toContain("baz=qux");
  });

  test("removes all except persisted and new", () => {
    const params = { newparam: "x" };
    const result = getUpdatedHash(params);
    expect(result).toContain("newparam=x");
    expect(result).toContain("hl=en");
    expect(result).toContain("enable_feature=1");
    expect(result).not.toContain("foo=bar");
    expect(result).not.toContain("baz=qux");
  });

  test("works with empty hash", () => {
    window.location.hash = "";
    const params = { foo: "bar" };
    const result = getUpdatedHash(params);
    expect(result).toContain("foo=bar");
    expect(result).not.toContain("hl=");
    expect(result).not.toContain("enable_feature=");
  });

  test("does not add param if value is undefined", () => {
    const params = { foo: undefined as any };
    const result = getUpdatedHash(params);
    expect(result).not.toContain("foo=");
    expect(result).toContain("hl=en");
    expect(result).toContain("enable_feature=1");
  });
});
