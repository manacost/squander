import { assert } from "#lib/core/assert.js";

type Unsubscriber = () => void;

export interface EventDispatcher<EventMap extends Record<string, any> = Record<string, any>> {
  on: <EventName extends keyof EventMap>(type: EventName, callback: (event: CustomEvent<EventMap[EventName]>) => unknown) => Unsubscriber;
  once: <EventName extends keyof EventMap>(type: EventName, callback: (event: CustomEvent<EventMap[EventName]>) => unknown) => Unsubscriber;
  off: <EventName extends keyof EventMap>(type: EventName, callback?: (event: CustomEvent<EventMap[EventName]>) => unknown) => void;
  emit: <EventName extends keyof EventMap>(event: EventName, detail?: EventMap[EventName]) => void;
  clear: () => void;
}

export const create_event_dispatcher = <EventMap extends Record<string, any>>(): EventDispatcher<EventMap> => {
  const events = new Map<keyof EventMap, CallableFunction[]>();
  const signal: EventDispatcher<EventMap> = {
    on: (type, callback) => {
      const list = events.get(type) ?? [];
      list.push(callback);
      events.set(type, list);

      return () => signal.off(type, callback);
    },

    once: (type, callback) => {
      const unsub = signal.on(type, (detail: CustomEvent<EventMap[typeof type]>) => {
        unsub();
        callback(detail);
      });

      return unsub;
    },

    emit: (type, detail?: EventMap[typeof type]) => {
      const callbacks = events.get(type) ?? [];
      assert(typeof type === "string");

      const event = new CustomEvent(type, { detail });

      callbacks.forEach((cb) => {
        cb(event);
      });
    },

    off: (type, callback = undefined) => {
      if (callback === undefined) {
        events.set(type, []);
      } else {
        const list = events.get(type) ?? [];
        events.set(
          type,
          list.filter((cb) => cb !== callback),
        );
      }
    },
    clear: () => {
      events.clear();
    },
  };

  return signal;
};
