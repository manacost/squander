import { assert } from "#lib/core/assert.js";

type Unsubscriber = () => void;

type EventCallback = (event: CustomEvent<unknown>) => unknown;
type EventEntry = { original: unknown; callback: EventCallback };

export type EventDispatcher<EventMap extends Record<string, unknown> = Record<string, unknown>> = {
  on: <EventName extends keyof EventMap>(type: EventName, callback: (event: CustomEvent<EventMap[EventName]>) => unknown) => Unsubscriber;
  once: <EventName extends keyof EventMap>(type: EventName, callback: (event: CustomEvent<EventMap[EventName]>) => unknown) => Unsubscriber;
  off: <EventName extends keyof EventMap>(type: EventName, callback?: (event: CustomEvent<EventMap[EventName]>) => unknown) => void;
  emit: <EventName extends keyof EventMap>(event: EventName, detail?: EventMap[EventName]) => void;
  clear: () => void;
};

export const create_event_dispatcher = <EventMap extends Record<string, unknown>>(): EventDispatcher<EventMap> => {
  const events = new Map<keyof EventMap, EventEntry[]>();
  const signal: EventDispatcher<EventMap> = {
    on: (type, callback) => {
      const list = events.get(type) ?? [];
      list.push({ original: callback, callback: (event) => callback(event as CustomEvent<EventMap[typeof type]>) });
      events.set(type, list);

      return () => {
        signal.off(type, callback);
      };
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

      callbacks.forEach((entry) => {
        entry.callback(event);
      });
    },

    off: (type, callback) => {
      if (callback === undefined) {
        events.set(type, []);
      } else {
        const list = events.get(type) ?? [];
        events.set(
          type,
          list.filter((entry) => entry.original !== callback),
        );
      }
    },
    clear: () => {
      events.clear();
    },
  };

  return signal;
};
