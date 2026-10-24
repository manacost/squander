import type { Ticker } from "pixi.js";
import { create_cooldown, wait } from "./utils.js";
import battle from "./battle.js";
import { create_signal } from "#lib/core/signal.js";
import { Scenes } from "#lib/core/scene.js";
import { ui_proxy } from "#lib/ui/ui.svelte.ts";

// Random utilities
export const sign = () => (Math.random() > 0.5 ? 1 : -1);

export const random = (start: number, end: number) => {
  return start + Math.round(Math.random() * (end - start));
};

export const pick_option = <T>(list: T[]): T => {
  const index = random(0, list.length - 1);
  return list[index];
};

type Element<Type> = Type extends Array<infer Item> ? Item : never;

export const pick_random = <T extends Array<any>>(list: T): Element<T> => {
  const index = random(0, list.length - 1);
  return list.at(index)!;
};

export const random_letter = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
export const random_word = (word_length: number = 4) => {
  return new Array(word_length)
    .fill(true)
    .map((a) => String.fromCharCode(65 + Math.floor(Math.random() * 26)))
    .join("");
};

export const random_array = (l: number) => {
  return new Array(l).fill(true).map((a, i) => i);
};

// Action types and strategies
export type BattleTargets = "enemy" | "ally" | "self" | "none" | "dead";

export type BattleAction = {
  id: BattleActionId;
  label: string;
  target: BattleTargets;
};

export interface ActionStrategy {
  execute(actor: BattleActor, target: BattleActor | undefined): void;
}

export class AttackStrategy implements ActionStrategy {
  execute(actor: BattleActor, target: BattleActor | undefined): void {
    if (!target) throw new Error("Attack requires a target");
    if (target.buffs.includes("defend")) {
      target.stats.health -= actor.stats.damage * 0.5;
    } else {
      target.stats.health -= actor.stats.damage;
    }
  }
}

export class DefendStrategy implements ActionStrategy {
  execute(actor: BattleActor, target: BattleActor | undefined): void {
    actor.buffs.push("defend");
  }
}

export class HealStrategy implements ActionStrategy {
  execute(actor: BattleActor, target: BattleActor | undefined): void {
    if (!target) throw new Error("Heal requires a target");
    const base_heal = 4;
    target.stats.health += random(base_heal, base_heal * 2);
  }
}

export class KillStrategy implements ActionStrategy {
  execute(actor: BattleActor, target: BattleActor | undefined): void {
    if (!target) throw new Error("Kill requires a target");
    target.stats.health = 0;
  }
}

export class NothingStrategy implements ActionStrategy {
  execute(actor: BattleActor, target: BattleActor | undefined): void {
    // do nothing
  }
}

export const actionStrategies = {
  attack: new AttackStrategy(),
  defend: new DefendStrategy(),
  heal: new HealStrategy(),
  kill: new KillStrategy(),
  nothing: new NothingStrategy(),
} satisfies Record<string, ActionStrategy>;

export type BattleActionId = keyof typeof actionStrategies;

// Battle Actions
export const attackAction: BattleAction = {
  id: "attack",
  label: "Attack",
  target: "enemy",
};

export const killAction: BattleAction = {
  id: "kill",
  label: "kill",
  target: "enemy",
};

export const defendAction: BattleAction = {
  id: "defend",
  label: "Defend",
  target: "self",
};

export const healAction: BattleAction = {
  id: "heal",
  label: "Heal",
  target: "ally",
};

export const nothingAction: BattleAction = {
  id: "nothing",
  label: "do nothing",
  target: "none",
};

// Actor types and functions
export type Team = "player" | "enemy" | "environment";

export type BattleStats = {
  dead: boolean;
  health: number;
  max_health: number;
  damage: number;
};

type Entity = unknown;
type Buff = unknown;

export type BattleActor = {
  can_act: boolean;
  id: Entity;
  name: string;
  team: Team;
  actions: BattleAction[];
  stats: BattleStats;
  buffs: Buff[];
  atb_speed: number;
  atb_value: number;
  atb_max: number;
  player_controlled: boolean;
};

export const random_stats = (team: Team): BattleStats => {
  const base_hp = team === "enemy" ? random(2, 4) : random(10, 15);
  const base_dmg = team === "enemy" ? random(1, 2) : 8 + random(1, 4);
  const max_health = base_hp * random(2, 6);
  return {
    damage: base_dmg,
    dead: false,
    health: max_health,
    max_health: max_health,
  };
};

export const random_actions = () => {
  return [attackAction, defendAction, healAction];
};

let ids = 0;
export const create_enemy = (): BattleActor => {
  const id = ++ids;
  return {
    can_act: false,
    id,
    name: `Wolf`,
    actions: [attackAction],
    buffs: [],
    atb_speed: random(10, 15),
    stats: random_stats("enemy"),
    team: "enemy",
    atb_max: 1000,
    atb_value: 0,
    player_controlled: false,
  };
};

export const create_player = (): BattleActor => {
  const id = ++ids;
  return {
    can_act: false,
    id,
    name: `Knight-${random_word(random(4, 6))}`,
    actions: [attackAction, defendAction, healAction, killAction],
    buffs: [],
    atb_speed: random(5, 10),
    stats: random_stats("player"),
    team: "player",
    atb_max: 1000,
    atb_value: 0,
    player_controlled: true,
  };
};

// AI
export const create_ai = (state: BattleState, enqueue: BattleSystem["enqueue"]) => {
  const action_state = new Set<BattleActor>();
  const is_handled = (actor: BattleActor) => action_state.has(actor);

  const perform_action = async (actor: BattleActor) => {
    const action = pick_option(actor.actions);

    action_state.add(actor);

    if (action) {
      let foes: BattleActor[];
      let party: BattleActor[];
      if (actor.team === "enemy") {
        foes = state.party;
        party = state.foes;
      } else if (actor.team === "player") {
        foes = state.foes;
        party = state.party;
      } else {
        throw new Error(`AI not implemented for team: ${actor.team}`);
      }

      let target: BattleActor | undefined = undefined;
      if (action.target === "enemy") {
        target = pick_option(foes);
      } else if (action.target === "ally") {
        target = pick_option(party);
      } else if (action.target === "self") {
        target = actor;
      }

      const battle_queue_item: BattleQueueItem = { actor, action, target };
      await enqueue(battle_queue_item);

      action_state.delete(actor);
    }
  };

  return {
    is_handled,
    perform_action,
  };
};

// Battle System Types
export type BattlePhase = "victory" | "defeat" | "active" | "preparing";
export type BattleState = {
  queue: BattleQueueItem[];
  phase: BattlePhase;
  party: BattleActor[];
  foes: BattleActor[];
};

export type BattleQueueItem = {
  action: BattleAction;
  actor: BattleActor;
  target?: BattleActor;
};

export type InitBattleState = {
  party: BattleActor[];
  foes: BattleActor[];
};

export type BattleSystem = ReturnType<typeof create_battle_system>;

export type ActionSystem = typeof action_system;

const action_system = {
  check_hp: (actor: BattleActor) => {
    if (actor.stats.health <= 0) {
      actor.stats.dead = true;
    }
  },
  execute_action: async (transaction: BattleQueueItem) => {
    const { actor, target, action } = transaction;

    const strategy = actionStrategies[action.id];
    if (!strategy) {
      throw new Error(`Unknown action: ${action.id}`);
    }

    strategy.execute(actor, target);

    if (target) {
      action_system.check_hp(target);
    }
  },

  reset_actor: async (actor: BattleActor) => {
    actor.can_act = false;
    await wait(1000);
    actor.atb_value = 0;
  },
};

export const create_battle_system = (initial_state: InitBattleState) => {
  console.log("create_battle_system");
  let mounted: boolean = false;
  const state = ui_proxy<BattleState>({
    ...initial_state,
    queue: [],
    phase: "active",
  });

  // let { party, foes } = initial_state;
  // let phase = ui_proxy("active");

  // let queue: BattleQueueItem[] = ui_proxy([]);
  let members = ui_proxy<BattleActor[]>([]);

  const enqueue = async (item: BattleQueueItem) => {
    state.queue.push(item);
    await action_system.reset_actor(item.actor);
  };

  const ai = create_ai(state, enqueue);

  const on_outcome = create_signal<boolean>();

  const queue_cooldown = create_cooldown(2000);

  const process_queue = async () => {
    if (state.queue.length >= 0) {
      state.queue = state.queue.filter((item) => !item.actor.stats.dead); // remove dead
    }

    if (state.queue.length > 0) {
      const item = state.queue.shift()!;
      await action_system.execute_action(item);
    }
  };

  const update_atb = (actor: BattleActor, t: Ticker) => {
    actor.atb_value += actor.atb_speed * t.deltaTime;
    actor.atb_value = Math.min(actor.atb_max, actor.atb_value);
    if (actor.atb_value >= actor.atb_max) {
      actor.can_act = true;
    } else {
      actor.can_act = false;
    }
  };

  const api = {
    outcome: () =>
      new Promise<boolean>((resolve) => {
        on_outcome.once((result) => resolve(result));
      }),

    random_foes: () => {
      console.log("random foes");
      state.foes.length = 0;
      state.foes = [];
      const foes = random_array(random(2, 4)).map((a) => create_enemy());
      api.add_foe(...foes);
    },

    enqueue,

    update: (t: Ticker) => {
      queue_cooldown.update(t.deltaMS);

      if (state.phase === "active") {
        const foes_is_dead = state.foes.every((actor) => actor.stats.dead);
        const party_is_dead = state.party.every((actor) => actor.stats.dead);
        if (party_is_dead) {
          state.phase = "defeat";
          on_outcome.emit(false);
          return;
        } else if (foes_is_dead) {
          state.phase = "victory";
          on_outcome.emit(true);
        }
      }

      for (const member of members) {
        if (member.stats.dead) {
          continue;
        }

        if (state.queue.find((item) => item.actor.id === member.id)) {
          continue;
        }

        update_atb(member, t);

        if (member.can_act && !member.player_controlled) {
          if (!ai.is_handled(member)) {
            ai.perform_action(member);
          }
        }
      }

      if (queue_cooldown.ready()) {
        process_queue();
        queue_cooldown.restart();
      }
    },

    state,
    members,

    add_party_member: (...actor: BattleActor[]) => {
      state.party.push(...actor);
    },

    add_foe: (...foes: BattleActor[]) => {
      state.foes.push(...foes);
    },

    start_battle: async () => {
      state.phase = "active";
      // state.queue.length = 0;
      state.queue = [];
      members = [...state.party, ...state.foes];

      if (!mounted) {
        mounted = true;
        await Scenes.push(battle);
      }
    },

    end_battle: async () => {
      mounted = false;
      await Scenes.pop();
    },
  };

  return api;
};

// // Initialize battle system
// export const battle_system = create_battle_system({
//   party: [create_player(), create_player(), create_player()],
//   foes: [],
// });
