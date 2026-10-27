export type PreparedGeometry = Readonly<{
  vertices: readonly Readonly<{ x: number; y: number }>[];
  indices: readonly number[];
}>;

export type GeometryOwner = Readonly<{
  create: (geometry: PreparedGeometry) => GeometryHandle;
  dispose: () => void;
}>;

export type GeometryHandle = Readonly<{
  read: (owner: GeometryOwner) => PreparedGeometry;
  update: (owner: GeometryOwner, geometry: PreparedGeometry) => void;
  release: () => void;
}>;

type RecordState = { geometry: PreparedGeometry; released: boolean };

const snapshot_geometry = (geometry: PreparedGeometry): PreparedGeometry => {
  const vertices = geometry.vertices.map((vertex, index) => {
    if (!Number.isFinite(vertex.x) || !Number.isFinite(vertex.y)) throw new RangeError(`geometry vertex ${String(index)} must be finite`);
    return Object.freeze({ x: vertex.x, y: vertex.y });
  });
  const indices = geometry.indices.map((index) => {
    if (!Number.isInteger(index) || index < 0 || index >= vertices.length) throw new RangeError("geometry index must reference a vertex");
    return index;
  });
  if (indices.length === 0 || indices.length % 3 !== 0) throw new RangeError("geometry must contain indexed triangles");
  return Object.freeze({ vertices: Object.freeze(vertices), indices: Object.freeze(indices) });
};

export const create_geometry_owner = (): GeometryOwner => {
  const records = new Set<RecordState>();
  let disposed = false;
  const owner_ref: { current?: GeometryOwner } = {};

  const create = (geometry: PreparedGeometry): GeometryHandle => {
    if (disposed) throw new Error("geometry owner is disposed");
    const state: RecordState = { geometry: snapshot_geometry(geometry), released: false };
    records.add(state);
    const read = (read_owner: GeometryOwner): PreparedGeometry => {
      if (read_owner !== owner_ref.current) throw new Error("geometry belongs to another owner");
      if (disposed) throw new Error("geometry owner is disposed");
      if (state.released) throw new Error("geometry handle is released");
      return state.geometry;
    };
    const update = (update_owner: GeometryOwner, next_geometry: PreparedGeometry): void => {
      if (update_owner !== owner_ref.current) throw new Error("geometry belongs to another owner");
      if (disposed) throw new Error("geometry owner is disposed");
      if (state.released) throw new Error("geometry handle is released");
      state.geometry = snapshot_geometry(next_geometry);
    };
    const release = (): void => {
      if (state.released) return;
      state.released = true;
      records.delete(state);
    };
    return Object.freeze({ read, update, release });
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    for (const state of records) state.released = true;
    records.clear();
  };

  const owner = Object.freeze({ create, dispose });
  owner_ref.current = owner;
  return owner;
};
