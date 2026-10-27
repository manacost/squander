import { describe, expect, it } from "vitest";
import { create_geometry_owner } from "./geometry_ownership.js";

const geometry = (x: number) => ({ vertices: Object.freeze([{ x, y: 0 }]), indices: Object.freeze([0, 0, 0]) });

describe("[resource-ownership] game-scoped geometry handles", () => {
  it("reads and updates geometry only through its creating owner", () => {
    const owner = create_geometry_owner();
    const foreign_owner = create_geometry_owner();
    const handle = owner.create(geometry(1));

    expect(handle.read(owner)).toEqual(geometry(1));
    handle.update(owner, geometry(2));
    expect(handle.read(owner)).toEqual(geometry(2));
    expect(() => handle.read(foreign_owner)).toThrow("geometry belongs to another owner");
    expect(() => {
      handle.update(foreign_owner, geometry(3));
    }).toThrow("geometry belongs to another owner");
  });

  it("snapshots application-owned geometry arrays", () => {
    const owner = create_geometry_owner();
    const vertices = [{ x: 1, y: 0 }];
    const indices = [0, 0, 0];
    const handle = owner.create({ vertices, indices });

    vertices[0].x = 9;
    indices[0] = 2;

    expect(handle.read(owner)).toEqual(geometry(1));
  });

  it("rejects released handles and keeps release idempotent", () => {
    const owner = create_geometry_owner();
    const handle = owner.create(geometry(1));

    handle.release();
    handle.release();
    expect(() => handle.read(owner)).toThrow("geometry handle is released");
    expect(() => {
      handle.update(owner, geometry(2));
    }).toThrow("geometry handle is released");
  });

  it("notifies one-shot release observers on release and owner disposal", () => {
    const owner = create_geometry_owner();
    const first = owner.create(geometry(1));
    const second = owner.create(geometry(2));
    let notifications = 0;
    first.on_release(() => {
      notifications += 1;
    });
    second.on_release(() => {
      notifications += 1;
    });

    first.release();
    first.release();
    expect(notifications).toBe(1);
    owner.dispose();
    expect(notifications).toBe(2);
  });

  it("invalidates all handles on owner disposal and rejects new geometry", () => {
    const owner = create_geometry_owner();
    const handle = owner.create(geometry(1));

    owner.dispose();
    owner.dispose();
    expect(() => handle.read(owner)).toThrow("geometry owner is disposed");
    expect(() => owner.create(geometry(2))).toThrow("geometry owner is disposed");
  });
});
