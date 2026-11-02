export type Subscriber<T> = (value: T) => void;

/** Unsubscribes from value updates. */
export type Unsubscriber = () => void;

/** Callback to update a value. */
export type Updater<T> = (value: T) => T;

/**
 * Start and stop notification callbacks.
 * This function is called when the first subscriber subscribes.
 *
 * @param set Function that sets the value of the store.
 * @param update Function that sets the value of the store after passing the current value to the update function.
 * @returns Optionally, a cleanup function that is called when the last remaining
 * subscriber unsubscribes.
 */
export type StartStopNotifier<T> = (set: (value: T) => void, update: (fn: Updater<T>) => void) => undefined | (() => void);

/** Readable interface for subscribing. */
export type Readable<T> = {
  /**
   * Subscribe on value changes.
   * @param run subscription callback
   * @param invalidate cleanup callback
   */
  subscribe(run: Subscriber<T>, invalidate?: () => void): Unsubscriber;

  get: () => T;
};

/** Writable interface for both updating and subscribing. */
export type Writable<T> = {
  /**
   * Set value and inform subscribers.
   * @param value to set
   */
  set(value: T): void;

  /**
   * Update value using callback and inform subscribers.
   * @param updater callback
   */
  update(updater: Updater<T>): void;
} & Readable<T>;

/** One or more `Readable`s. */
export type Stores = Readable<unknown> | [Readable<unknown>, ...Readable<unknown>[]] | Readable<unknown>[];

/** One or more values from `Readable` stores. */
export type StoresValues<S extends Readable<unknown>[]> = {
  [K in keyof S]: S[K] extends Readable<infer U> ? U : never;
};
