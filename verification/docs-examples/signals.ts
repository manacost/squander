import { create_event_dispatcher, create_signal } from "squander/signals";

const score_changed = create_signal<number>();
const stop_score = score_changed.subscribe((score) => console.log(score));
score_changed.emit(10);
stop_score();

type Events = { score: { points: number }; reset: undefined };
const events = create_event_dispatcher<Events>();
events.on("score", ({ points }) => console.log(points));
events.emit("score", { points: 10 });
events.emit("reset");
