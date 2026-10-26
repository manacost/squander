import { describe, expect, it } from "vitest";
import { create_resource_owner } from "./resource_ownership.js";

describe("[resource-ownership] explicit handles", () => {
  it("shares a resource while invalidating only the released handle", () => {
    const destroyed: string[] = [];
    const owner = create_resource_owner();
    const first = owner.acquire("texture", (resource) => destroyed.push(resource));
    const second = first.share();

    first.release();
    expect(() => first.read()).toThrow("resource handle is released");
    expect(second.read()).toBe("texture");
    expect(destroyed).toEqual([]);

    second.release();
    expect(destroyed).toEqual(["texture"]);
    second.release();
  });

  it("keeps prior accepted work alive through a lease", () => {
    const destroyed: string[] = [];
    const owner = create_resource_owner();
    const handle = owner.acquire("buffer", (resource) => destroyed.push(resource));
    const lease = handle.acquire_lease();

    handle.release();
    expect(destroyed).toEqual([]);
    expect(lease.resource).toBe("buffer");
    lease.release();
    expect(destroyed).toEqual(["buffer"]);
    lease.release();
  });

  it("disposes all handles and rejects future acquisitions", () => {
    const owner = create_resource_owner();
    const handle = owner.acquire({}, () => undefined);

    owner.dispose();
    owner.dispose();
    expect(() => handle.read()).toThrow("resource handle is released");
    expect(() => owner.acquire({}, () => undefined)).toThrow("resource owner is disposed");
  });
});
