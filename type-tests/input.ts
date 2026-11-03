import { create_input_router, type InputEvent, type InputDisposition } from "../src/lib/index.js";

const router = create_input_router();

router.push_scene((event) => {
  if (event.type === "key") {
    const key: string = event.key;
    void key;
  }
  if (event.type === "pointer") {
    const x: number = event.x;
    void x;
  }
  if (event.type === "gamepad" && event.phase === "button") {
    const pressed: boolean = event.pressed;
    void pressed;
  }
  const disposition: InputDisposition = "pass";
  return disposition;
});

const valid_event: InputEvent = {
  type: "key",
  phase: "up",
  key: "Escape",
  code: "Escape",
  repeat: false,
  modifiers: { alt: false, ctrl: false, meta: false, shift: false },
};
router.dispatch(valid_event);

// @ts-expect-error Unknown input event kinds are not part of the raw-device contract.
router.dispatch({ type: "action", name: "open_menu" });

// @ts-expect-error Handler dispositions are intentionally limited to explicit routing outcomes.
router.push_scene(() => "handled");
