type Unsubscriber = () => void;
type EventEntry = { original: unknown; callback: (payload: unknown) => void };
type EventPayloadArgs<Payload> = [Payload] extends [undefined] ? [payload?: Payload] : [payload: Payload];

export type EventDispatcher<EventMap extends Record<string, unknown> = Record<string, unknown>> = {
  on: <EventName extends keyof EventMap>(event: EventName, callback: (payload: EventMap[EventName]) => void) => Unsubscriber;
  once: <EventName extends keyof EventMap>(event: EventName, callback: (payload: EventMap[EventName]) => void) => Unsubscriber;
  off: <EventName extends keyof EventMap>(event: EventName, callback?: (payload: EventMap[EventName]) => void) => void;
  emit: <EventName extends keyof EventMap>(event: EventName, ...args: EventPayloadArgs<EventMap[EventName]>) => void;
  clear: () => void;
};

export const create_event_dispatcher = <EventMap extends Record<string, unknown>>(): EventDispatcher<EventMap> => {
  const events = new Map<keyof EventMap, EventEntry[]>();
  const dispatcher: EventDispatcher<EventMap> = {
    on: (event, callback) => {
      const list = events.get(event) ?? [];
      list.push({
        original: callback,
        callback: (payload) => {
          // eslint-disable-next-line no-restricted-syntax -- EventMap is erased by the heterogeneous listener registry.
          callback(payload as EventMap[typeof event]);
        },
      });
      events.set(event, list);

      return () => {
        dispatcher.off(event, callback);
      };
    },

    once: (event, callback) => {
      const unsubscribe = dispatcher.on(event, (payload) => {
        unsubscribe();
        callback(payload);
      });

      return unsubscribe;
    },

    emit: (event, ...args) => {
      const [payload] = args;
      const current_entries = [...(events.get(event) ?? [])];
      current_entries.forEach((entry) => {
        if (events.get(event)?.includes(entry) === true) {
          entry.callback(payload);
        }
      });
    },

    off: (event, callback) => {
      if (callback === undefined) {
        events.delete(event);
      } else {
        const list = events.get(event);
        if (list === undefined) return;
        events.set(
          event,
          list.filter((entry) => entry.original !== callback),
        );
      }
    },
    clear: () => {
      events.clear();
    },
  };

  return dispatcher;
};
