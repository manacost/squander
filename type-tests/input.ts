import { create_browser_gamepad_adapter, create_input_router, type InputDisposition, type InputEvent } from "../src/lib/index.js";

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

const gamepad_adapter = create_browser_gamepad_adapter({ router, window });
const gamepad = gamepad_adapter.state.get(0);
if (gamepad !== undefined) {
  const axis: number = gamepad.axes[0] ?? 0;
  const pressed: boolean = gamepad.buttons[0]?.pressed ?? false;
  void axis;
  void pressed;
}
gamepad_adapter.poll();
gamepad_adapter.dispose();

// @ts-expect-error Gamepad state keys are numeric indexes, not device names.
router.dispatch({ type: "gamepad", phase: "axis", gamepad_id: "pad", index: 0, axis: 0, value: 0, label: "pad" });

// @ts-expect-error Unknown input event kinds are not part of the raw-device contract.
router.dispatch({ type: "action", name: "open_menu" });

// @ts-expect-error Handler dispositions are intentionally limited to explicit routing outcomes.
router.push_scene(() => "handled");
