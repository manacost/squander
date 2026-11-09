export type SignalUnsubscriber = () => void;

type SignalEmitArgs<EventDetail> = [EventDetail] extends [undefined] ? [detail?: EventDetail] : [detail: EventDetail];

export type Signal<EventDetail = undefined> = {
  subscribe: (callback: (detail: EventDetail) => void) => SignalUnsubscriber;
  once: (callback: (detail: EventDetail) => void) => SignalUnsubscriber;
  unsubscribe: (callback?: (detail: EventDetail) => void) => void;
  clear: () => void;
  emit: (...args: SignalEmitArgs<EventDetail>) => void;
};

export const create_signal = <EventDetail = undefined>(): Signal<EventDetail> => {
  let listeners: ((detail: EventDetail) => void)[] = [];
  const signal: Signal<EventDetail> = {
    subscribe: (callback) => {
      listeners.push(callback);

      return () => {
        signal.unsubscribe(callback);
      };
    },

    once: (callback) => {
      const unsubscribe = signal.subscribe((detail) => {
        unsubscribe();
        callback(detail);
      });

      return unsubscribe;
    },

    emit: (detail?: EventDetail) => {
      const current_listeners = [...listeners];
      current_listeners.forEach((callback) => {
        if (listeners.includes(callback)) {
          // eslint-disable-next-line no-restricted-syntax -- The optional argument is constrained by SignalEmitArgs.
          callback(detail as EventDetail);
        }
      });
    },

    unsubscribe: (callback) => {
      if (callback === undefined) {
        listeners = [];
      } else {
        listeners = listeners.filter((listener) => listener !== callback);
      }
    },
    clear: () => {
      listeners = [];
    },
  };

  return signal;
};
