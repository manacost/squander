type SignalUnsubscriber = () => void;

export type Signal<EventDetail = unknown> = {
  subscribe: (callback: (detail: EventDetail) => void) => SignalUnsubscriber;
  once: (callback: (detail: EventDetail) => void) => SignalUnsubscriber;
  unsubscribe: (callback?: (detail: EventDetail) => void) => void;
  clear: () => void;
  emit: (detail: EventDetail) => void;
};
export const create_signal = <EventDetail = unknown>(): Signal<EventDetail> => {
  let listeners: Array<(detail: EventDetail) => void> = [];
  const signal: Signal<EventDetail> = {
    subscribe: (callback) => {
      listeners.push(callback);

      return () => signal.unsubscribe(callback);
    },

    once: (callback) => {
      const unsub = signal.subscribe((detail) => {
        callback(detail);
        unsub();
      });

      return unsub;
    },

    emit: (detail) => {
      [...listeners].forEach((cb) => {
        cb(detail);
      });
    },

    unsubscribe: (callback = undefined) => {
      if (callback === undefined) {
        listeners = [];
      } else {
        listeners = listeners.filter((cb) => cb !== callback);
      }
    },
    clear: () => {
      listeners = [];
    },
  };

  return signal;
};
