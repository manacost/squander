export {};

declare global {
  var __release_scene_ui_switch: (() => void) | undefined;
  var __scene_ui_late_mount_rejected: boolean | undefined;
  var __scene_ui_readback: Uint8Array | undefined;
  var __pending_scene_ui: { mount: () => Promise<void> } | undefined;
}
