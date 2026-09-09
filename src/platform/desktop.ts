import { isTauri } from '@tauri-apps/api/core';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { disable, enable, isEnabled } from '@tauri-apps/plugin-autostart';

export const isDesktopApp = isTauri();

type DesktopEventHandlers = {
  refresh: () => void;
  openSettings: () => void;
  logout: () => void;
  alwaysOnTopChanged: (enabled: boolean) => void;
  toggleAutostart: () => void;
};

let expandedSize: LogicalSize | null = null;

export async function subscribeToDesktopEvents(handlers: DesktopEventHandlers): Promise<() => void> {
  if (!isDesktopApp) return () => undefined;

  const listeners: UnlistenFn[] = await Promise.all([
    listen('calendar://refresh', handlers.refresh),
    listen('calendar://settings', handlers.openSettings),
    listen('calendar://logout', handlers.logout),
    listen<boolean>('calendar://always-on-top-changed', ({ payload }) => handlers.alwaysOnTopChanged(payload)),
    listen('calendar://toggle-autostart', handlers.toggleAutostart),
  ]);
  return () => listeners.forEach((unlisten) => unlisten());
}

export async function readDesktopSettings() {
  if (!isDesktopApp) return { autostart: false, alwaysOnTop: false };
  const window = getCurrentWindow();
  return { autostart: await isEnabled(), alwaysOnTop: await window.isAlwaysOnTop() };
}

export async function setAutostart(enabled: boolean): Promise<void> {
  if (!isDesktopApp) return;
  await (enabled ? enable() : disable());
}

export async function setAlwaysOnTop(enabled: boolean): Promise<void> {
  if (!isDesktopApp) return;
  await getCurrentWindow().setAlwaysOnTop(enabled);
}

export async function setCollapsedWindow(collapsed: boolean): Promise<void> {
  if (!isDesktopApp) return;
  const window = getCurrentWindow();

  if (collapsed) {
    const scaleFactor = await window.scaleFactor();
    expandedSize = (await window.innerSize()).toLogical(scaleFactor);
    await window.setResizable(false);
    await window.setSize(new LogicalSize(Math.max(expandedSize.width, 340), 126));
    return;
  }

  await window.setResizable(true);
  await window.setSize(expandedSize ?? new LogicalSize(340, 420));
}

export async function hideWindow(): Promise<void> {
  if (!isDesktopApp) return;
  await getCurrentWindow().hide();
}
