import { create_event_dispatcher, create_signal } from "../src/lib/signals/index.js";

type Events = {
  score: { points: number };
  reset: undefined;
};

const dispatcher = create_event_dispatcher<Events>();
dispatcher.on("score", ({ points }) => {
  const typed_points: number = points;
  void typed_points;
});
dispatcher.emit("score", { points: 10 });
dispatcher.emit("reset");

// @ts-expect-error Event payloads must match the declared event map.
dispatcher.emit("score", { points: "ten" });
// @ts-expect-error Unknown event names must be rejected.
dispatcher.emit("missing", undefined);

const number_signal = create_signal<number>();
number_signal.subscribe((value) => {
  const typed_value: number = value;
  void typed_value;
});
number_signal.emit(10);
// @ts-expect-error Payload-bearing signals require a payload.
number_signal.emit();

const notification_signal = create_signal();
notification_signal.subscribe((value) => {
  const typed_value: undefined = value;
  void typed_value;
});
notification_signal.emit();
