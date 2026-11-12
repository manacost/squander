import type { InputDisposition, InputModifiers, InputRouter, KeyboardInputEvent, PointerInputEvent } from "./input.js";
import type { ViewportSize } from "./viewport_sizing.js";

export type BrowserInputAdapterOptions = Readonly<{
  host: HTMLElement;
  router: InputRouter;
  capture_editable?: boolean;
  focus_on_pointer_down?: boolean;
  viewport?: ViewportSize;
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

const pointer_event = (
  event: PointerEvent | WheelEvent,
  host: HTMLElement,
  phase: PointerInputEvent["phase"],
  viewport: ViewportSize | undefined,
): PointerInputEvent => {
  const bounds = host.getBoundingClientRect();
  const is_wheel = phase === "wheel";
  const pointer = "pointerId" in event ? event : null;
  const wheel = "deltaX" in event ? event : null;
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;
  const content_x = viewport === undefined ? 0 : x - viewport.offset_x;
  const content_y = viewport === undefined ? 0 : y - viewport.offset_y;
  const inside_logical_content =
    viewport !== undefined &&
    content_x >= 0 &&
    content_y >= 0 &&
    content_x <= viewport.content_width &&
    content_y <= viewport.content_height;
  return {
    type: "pointer",
    phase,
    pointer_id: is_wheel ? 0 : (pointer?.pointerId ?? 0),
    pointer_type: is_wheel ? "mouse" : normalize_pointer_type(pointer?.pointerType ?? "mouse"),
    x,
    y,
    button: is_wheel ? -1 : (pointer?.button ?? -1),
    buttons: event.buttons,
    movement_x: is_wheel ? 0 : (pointer?.movementX ?? 0),
    movement_y: is_wheel ? 0 : (pointer?.movementY ?? 0),
    wheel_x: is_wheel ? (wheel?.deltaX ?? 0) : 0,
    wheel_y: is_wheel ? (wheel?.deltaY ?? 0) : 0,
    modifiers: modifiers(event),
    ...(viewport === undefined
      ? {}
      : {
          logical_x: viewport.content_width > 0 ? (content_x * viewport.logical_width) / viewport.content_width : 0,
          logical_y: viewport.content_height > 0 ? (content_y * viewport.logical_height) / viewport.content_height : 0,
          inside_logical_content,
        }),
  };
};

export const create_browser_input_adapter = (options: BrowserInputAdapterOptions): BrowserInputAdapter => {
  const { host, router } = options;
  let disposed = false;
  const active_keys = new Map<string, KeyboardInputEvent>();
  const active_pointers = new Map<number, PointerInputEvent>();
  const owner_document = host.ownerDocument;
  const owner_window = owner_document.defaultView;

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
    if (input.phase === "down") active_keys.set(input.code, input);
    if (input.phase === "up") active_keys.delete(input.code);
    apply_disposition(event, router.dispatch(input));
  };

  const on_pointer = (event: PointerEvent): void => {
    if (options.focus_on_pointer_down && event.type === "pointerdown") host.focus();
    const phase =
      event.type === "pointerdown" ? "down" : event.type === "pointerup" ? "up" : event.type === "pointercancel" ? "cancel" : "move";
    const input = pointer_event(event, host, phase, options.viewport);
    if (input.phase === "down") active_pointers.set(input.pointer_id, input);
    if (input.phase === "up" || input.phase === "cancel") active_pointers.delete(input.pointer_id);
    const disposition = router.dispatch(input);
    apply_disposition(event, disposition);
    if (event.type === "pointerdown" && disposition !== "pass" && typeof host.setPointerCapture === "function") {
      host.setPointerCapture(event.pointerId);
    }
    if ((event.type === "pointerup" || event.type === "pointercancel") && host.hasPointerCapture(event.pointerId)) {
      host.releasePointerCapture(event.pointerId);
    }
  };

  const on_wheel = (event: WheelEvent): void => {
    apply_disposition(event, router.dispatch(pointer_event(event, host, "wheel", options.viewport)));
  };

  const clear_active_input = (): void => {
    for (const input of active_keys.values()) {
      router.dispatch({ ...input, phase: "up", repeat: false, modifiers: { alt: false, ctrl: false, meta: false, shift: false } });
    }
    active_keys.clear();
    for (const input of active_pointers.values()) {
      router.dispatch({ ...input, phase: "cancel", buttons: 0, movement_x: 0, movement_y: 0 });
      if (host.hasPointerCapture(input.pointer_id)) host.releasePointerCapture(input.pointer_id);
    }
    active_pointers.clear();
  };

  host.addEventListener("keydown", on_key, { capture: true });
  host.addEventListener("keyup", on_key, { capture: true });
  host.addEventListener("pointerdown", on_pointer, { capture: true });
  host.addEventListener("pointerup", on_pointer, { capture: true });
  host.addEventListener("pointermove", on_pointer, { capture: true });
  host.addEventListener("pointercancel", on_pointer, { capture: true });
  host.addEventListener("wheel", on_wheel, { capture: true, passive: false });
  owner_window?.addEventListener("blur", clear_active_input);
  owner_document.addEventListener("visibilitychange", clear_active_input);

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
    owner_window?.removeEventListener("blur", clear_active_input);
    owner_document.removeEventListener("visibilitychange", clear_active_input);
    clear_active_input();
  };

  return Object.freeze({ focus, dispose });
};
