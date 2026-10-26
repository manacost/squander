export type ResourceDestroyer<Resource> = (resource: Resource) => void;

export type ResourceLease<Resource> = Readonly<{
  resource: Resource;
  release: () => void;
}>;

export type ResourceHandle<Resource> = Readonly<{
  read: () => Resource;
  share: () => ResourceHandle<Resource>;
  acquire_lease: () => ResourceLease<Resource>;
  release: () => void;
}>;

export type ResourceOwner = Readonly<{
  acquire: <Resource>(resource: Resource, destroy: ResourceDestroyer<Resource>) => ResourceHandle<Resource>;
  dispose: () => void;
}>;

type ResourceRecord<Resource> = {
  resource: Resource;
  destroy: ResourceDestroyer<Resource>;
  handles: Set<object>;
  lease_count: number;
  destroyed: boolean;
};

class ResourceHandleError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ResourceHandleError";
  }
}

const assert_live = <Resource>(record: ResourceRecord<Resource>, released: boolean): void => {
  if (released || record.destroyed) {
    throw new ResourceHandleError("resource handle is released");
  }
};

const maybe_destroy = <Resource>(record: ResourceRecord<Resource>): void => {
  if (!record.destroyed && record.handles.size === 0 && record.lease_count === 0) {
    record.destroyed = true;
    record.destroy(record.resource);
  }
};

export const create_resource_owner = (): ResourceOwner => {
  const records = new Set<ResourceRecord<unknown>>();
  let disposed = false;

  const acquire = <Resource>(resource: Resource, destroy: ResourceDestroyer<Resource>): ResourceHandle<Resource> => {
    if (disposed) {
      throw new ResourceHandleError("resource owner is disposed");
    }

    const record: ResourceRecord<Resource> = {
      resource,
      destroy,
      handles: new Set(),
      lease_count: 0,
      destroyed: false,
    };
    records.add(record as ResourceRecord<unknown>);

    const create_handle = (): ResourceHandle<Resource> => {
      const token = {};
      let released = false;
      record.handles.add(token);

      const read = (): Resource => {
        assert_live(record, released);
        return record.resource;
      };

      const share = (): ResourceHandle<Resource> => {
        assert_live(record, released);
        return create_handle();
      };

      const acquire_lease = (): ResourceLease<Resource> => {
        assert_live(record, released);
        record.lease_count += 1;
        let lease_released = false;
        return Object.freeze({
          resource: record.resource,
          release: () => {
            if (lease_released) {
              return;
            }
            lease_released = true;
            record.lease_count -= 1;
            maybe_destroy(record);
          },
        });
      };

      const release = (): void => {
        if (released) {
          return;
        }
        released = true;
        record.handles.delete(token);
        maybe_destroy(record);
      };

      return Object.freeze({ read, share, acquire_lease, release });
    };

    return create_handle();
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    for (const record of records) {
      record.handles.clear();
      maybe_destroy(record);
    }
  };

  return Object.freeze({ acquire, dispose });
};
