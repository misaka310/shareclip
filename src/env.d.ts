import type { ShareClipApi } from '../electron/ipc';

declare global {
  interface Window {
    shareclip?: ShareClipApi;
  }
}

export {};
