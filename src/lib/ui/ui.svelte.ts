import { mount as mountComponent, unmount, type ComponentProps, type Component as Svelte5Component, type SvelteComponent } from "svelte";

import { get, writable, type Unsubscriber, type Writable } from "svelte/store";
import { assert } from "#lib/core/assert.js";

export const root_el = writable<HTMLElement | undefined>(undefined);

export type UIBridge<UIComponent extends Svelte5Component<any>, Props extends ComponentProps<UIComponent> = ComponentProps<UIComponent>> = {
  mount: () => () => void;
  props: Props;
};

/**
 * Creates a proxied object that when provided to a `create_ui` call, the component will be reactive within the UI
 * @param initial_state
 */
export const ui_proxy = <T>(initial_state: T): T => {
  const field = $state<T>(initial_state);
  return field;
};

export const create_ui = <UIComponent extends Svelte5Component<any>, State extends ComponentProps<UIComponent>>(
  Component: UIComponent,
  initial_state: State,
): UIBridge<UIComponent, State> => {
  const props: State = $state({ ...initial_state });

  let component: Record<string, any> | undefined = undefined;

  const mount = () => {
    const target = get(root_el);
    assert(target !== undefined, "root element was not ready before ui.mount() was called");

    component = mountComponent(Component, {
      target,
      props,
    });

    return () => {
      if (component !== undefined) {
        unmount(component);
      }
    };
  };

  return {
    props,
    mount,
  };
};
