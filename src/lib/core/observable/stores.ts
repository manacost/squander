import type { Readable, StartStopNotifier, Subscriber, Unsubscriber, Writable, StoresValues } from "./store-types.js";

export type { Readable, Writable, Subscriber, Unsubscriber, StoresValues };

const noop = (): undefined => undefined;

export const create_writable = <T>(initial_value: T, start?: StartStopNotifier<T>): Writable<T> => {
  const subscribers = new Set<Subscriber<T>>();
  let inner_value: T = initial_value;
  let has_subscribers = false;
  let stop: (() => void) | undefined = undefined;

  const set = (value: T) => {
    if (value !== inner_value) {
      inner_value = value;
      if (has_subscribers && stop !== undefined) {
        subscribers.forEach((notify) => {
          notify(inner_value);
        });
      }
    }
  };

  const update = (fn: (old_value: T) => T) => {
    set(fn(inner_value));
  };

  const subscribe = (callback: Subscriber<T>): Unsubscriber => {
    subscribers.add(callback);

    has_subscribers = subscribers.size > 0;

    if (subscribers.size === 1) {
      stop = start?.(set, update) ?? noop;
    }

    callback(inner_value);

    return () => {
      subscribers.delete(callback);

      if (subscribers.size === 0 && stop !== undefined) {
        has_subscribers = false;
        stop();
        stop = undefined;
      }
    };
  };

  return {
    set,
    update,
    get: () => inner_value,
    subscribe,
  };
};

export const create_readable = <T>(initial_value: T, start: StartStopNotifier<T>): Readable<T> => {
  const inner = create_writable(initial_value, start);

  return {
    get: () => inner.get(),
    subscribe: (run, invalidate) => inner.subscribe(run, invalidate),
  };
};

export const create_readonly = <T>(store: Readable<T> | Writable<T>): Readable<T> => {
  return {
    get: () => store.get(),
    subscribe: (run, invalidate) => store.subscribe(run, invalidate),
  };
};

export const create_derived = <S extends [Readable<unknown>, ...Readable<unknown>[]], T>(
  stores: S,
  fn: (values: StoresValues<S>) => T,
  initial_value?: T,
): Readable<T> => {
  const get_store_values = <Values extends Readable<unknown>[]>(source: Values): StoresValues<Values> =>
    source.map((store) => store.get()) as StoresValues<Values>; // eslint-disable-line no-restricted-syntax -- Tuple element types are erased by Array.prototype.map.
  const get = (): T => fn(get_store_values(stores));
  const inner_value: T = initial_value ?? get();
  return create_readable(inner_value, (set) => {
    const unsubscribes: Unsubscriber[] = stores.map((store) =>
      store.subscribe(() => {
        set(get());
      }),
    );

    return () => {
      unsubscribes.forEach((unsub) => {
        unsub();
      });
    };
  });
};

const tapped_stores = new Map<Readable<unknown>, Unsubscriber>();

/**
 * Add a subscriber to one or many stores.
 * Primarily for readable stores as this will initiate / "start" them
 * @param store
 */
export const tap = (...stores: Readable<unknown>[]) => {
  stores.forEach((store) => {
    if (!tapped_stores.has(store)) {
      const unsub = store.subscribe(() => undefined);
      tapped_stores.set(store, unsub);
    }
  });
};

export const untap = (...stores: Readable<unknown>[]) => {
  stores.forEach((store) => {
    if (tapped_stores.has(store)) {
      const unsub = tapped_stores.get(store);
      if (unsub !== undefined) {
        unsub();
        tapped_stores.delete(store);
      }
    }
  });
};

export const untap_all = () => {
  tapped_stores.forEach((unsub) => {
    unsub();
  });
  tapped_stores.clear();
};
