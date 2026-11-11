import type { InputDisposition, InputModifiers, InputRouter, KeyboardInputEvent, PointerInputEvent } from "./input.js";

export type BrowserInputAdapterOptions = Readonly<{
  host: HTMLElement;
  router: InputRouter;
  capture_editable?: boolean;
  focus_on_pointer_down?: boolean;
}>;

export type BrowserInputAdapter = Readonly<{
  focus: () => void;
  dispose: () => void;
}>;

const modifiers = (event: KeyboardEvent | PointerEvent | WheelEvent): InputModifiers => ({
  alt: event.altKey,
  ctrl: event.ctrlKey,
  meta: event.metaKey,
  shift: event.shiftKey,
});

const is_editable_target = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  if (target.matches("input, textarea, select")) return true;
  const contenteditable = target.closest("[contenteditable]");
  return contenteditable !== null && contenteditable.getAttribute("contenteditable") !== "false";
};

const apply_disposition = (event: Event, disposition: InputDisposition): void => {
  if (disposition === "consume_and_prevent_default") event.preventDefault();
};

const normalize_pointer_type = (pointer_type: string): PointerInputEvent["pointer_type"] => {
  if (pointer_type === "pen" || pointer_type === "touch") return pointer_type;
  return "mouse";
};

const pointer_event = (event: PointerEvent | WheelEvent, host: HTMLElement, phase: PointerInputEvent["phase"]): PointerInputEvent => {
  const bounds = host.getBoundingClientRect();
  const is_wheel = phase === "wheel";
  const pointer = "pointerId" in event ? event : null;
  const wheel = "deltaX" in event ? event : null;
  return {
    type: "pointer",
    phase,
    pointer_id: is_wheel ? 0 : (pointer?.pointerId ?? 0),
    pointer_type: is_wheel ? "mouse" : normalize_pointer_type(pointer?.pointerType ?? "mouse"),
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
    button: is_wheel ? -1 : (pointer?.button ?? -1),
    buttons: event.buttons,
    movement_x: is_wheel ? 0 : (pointer?.movementX ?? 0),
    movement_y: is_wheel ? 0 : (pointer?.movementY ?? 0),
    wheel_x: is_wheel ? (wheel?.deltaX ?? 0) : 0,
    wheel_y: is_wheel ? (wheel?.deltaY ?? 0) : 0,
    modifiers: modifiers(event),
  };
};

export const create_browser_input_adapter = (options: BrowserInputAdapterOptions): BrowserInputAdapter => {
  const { host, router } = options;
  let disposed = false;

  const on_key = (event: KeyboardEvent): void => {
    if (!options.capture_editable && is_editable_target(event.target)) return;
    const input: KeyboardInputEvent = {
      type: "key",
      phase: event.type === "keydown" ? "down" : "up",
      key: event.key,
      code: event.code,
      repeat: event.repeat,
      modifiers: modifiers(event),
    };
    apply_disposition(event, router.dispatch(input));
  };

  const on_pointer = (event: PointerEvent): void => {
    if (options.focus_on_pointer_down && event.type === "pointerdown") host.focus();
    const phase = event.type === "pointerdown" ? "down" : event.type === "pointerup" ? "up" : "move";
    const disposition = router.dispatch(pointer_event(event, host, phase));
    apply_disposition(event, disposition);
    if (event.type === "pointerdown" && disposition !== "pass" && typeof host.setPointerCapture === "function") {
      host.setPointerCapture(event.pointerId);
    }
    if ((event.type === "pointerup" || event.type === "pointercancel") && host.hasPointerCapture(event.pointerId)) {
      host.releasePointerCapture(event.pointerId);
    }
  };

  const on_wheel = (event: WheelEvent): void => {
    apply_disposition(event, router.dispatch(pointer_event(event, host, "wheel")));
  };

  host.addEventListener("keydown", on_key, { capture: true });
  host.addEventListener("keyup", on_key, { capture: true });
  host.addEventListener("pointerdown", on_pointer, { capture: true });
  host.addEventListener("pointerup", on_pointer, { capture: true });
  host.addEventListener("pointermove", on_pointer, { capture: true });
  host.addEventListener("pointercancel", on_pointer, { capture: true });
  host.addEventListener("wheel", on_wheel, { capture: true, passive: false });

  const focus = (): void => {
    host.focus({ preventScroll: true });
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    host.removeEventListener("keydown", on_key, { capture: true });
    host.removeEventListener("keyup", on_key, { capture: true });
    host.removeEventListener("pointerdown", on_pointer, { capture: true });
    host.removeEventListener("pointerup", on_pointer, { capture: true });
    host.removeEventListener("pointermove", on_pointer, { capture: true });
    host.removeEventListener("pointercancel", on_pointer, { capture: true });
    host.removeEventListener("wheel", on_wheel, { capture: true });
  };

  return Object.freeze({ focus, dispose });
};
