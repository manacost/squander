# action-mapping

## Goal

Translate raw keyboard, pointer, and gamepad input into stable named actions
with deterministic digital edges, analog values, and atomic rebinding.

## Status

Implemented.

## Requirements

- `create_action_map` accepts a typed action-name-to-binding map and can attach
  to an existing `InputRouter` without consuming its events.
- Keyboard code, pointer button, gamepad button, and gamepad axis bindings are
  supported.
- Axis bindings support dead zones, inversion, direction, and scale.
- An action is pressed when any binding contributes a nonzero value. Analog
  resolution chooses the contribution with the strongest absolute value.
- `update()` is explicit. It computes `just_pressed` and `just_released` from
  the current and previous action states.
- `rebind()` validates the complete replacement before changing the map.
- Maps are independent and disposal removes the optional router subscription.
- Text input, IME, gestures, hit testing, and haptics remain separate.

## Scenarios

### Cross-device confirm

`confirm` combines keyboard Enter and a gamepad south button. Gameplay reads the
same action state regardless of which device produced it.

### Analog movement

An axis binding ignores a dead zone, applies inversion and scale, and reports a
continuous value. A keyboard binding can provide a digital fallback.

### Runtime rebinding

A settings screen replaces the bindings for `fire`. Invalid input is rejected
without changing the previous binding set.

## Acceptance criteria

- Keyboard and gamepad bindings can activate one action.
- Rebinding changes action behavior without changing gameplay code.
- Digital edges and analog values are deterministic across explicit updates.
- Raw router handlers remain available and action maps do not consume events.
- Independent maps do not share device state.
- Invalid binding values fail before a partial rebind.

## Usage description

```ts
const actions = create_action_map({
  router: game.input,
  bindings: {
    confirm: [
      { device: "keyboard", code: "Enter" },
      { device: "gamepad_button", button: 0 },
    ],
    move_x: [{ device: "gamepad_axis", axis: 0, dead_zone: 0.2, scale: 1 }],
  },
});

// Call once per simulation frame after raw input has been routed.
actions.update();
if (actions.get("confirm").just_pressed) confirm();
```

## Test references

- [`src/lib/core/runtime/action_mapping.test.ts`](../../src/lib/core/runtime/action_mapping.test.ts)
  covers cross-device digital actions, analog policies, edge transitions,
  atomic rebinding, and map isolation.
- [`type-tests/input.ts`](../../type-tests/input.ts) covers action-name and
  binding-shape inference.
- [`tests/input-routing.spec.ts`](../../tests/input-routing.spec.ts) covers
  browser keyboard/native-control routing; a dedicated rebinding UI fixture is
  a future example rather than a requirement of the adapter.

Planned verification for the dedicated rebinding UI fixture is explicit; raw
keyboard, router attachment, and fake gamepad behavior are covered above.

## Notes

Action maps are an input adapter, not a mandatory game-loop or ECS system.
