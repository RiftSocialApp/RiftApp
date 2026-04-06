import { contextBridge, ipcRenderer } from "electron";

const desktop = {
  minimize: () => {
    ipcRenderer.send("window:minimize");
  },
  /** Toggles maximize / restore (same as native square control). */
  maximize: () => {
    ipcRenderer.send("window:maximize-toggle");
  },
  close: () => {
    ipcRenderer.send("window:close");
  },
  isMaximized: () => ipcRenderer.invoke("window:is-maximized") as Promise<boolean>,
  onMaximizedChange: (cb: (maximized: boolean) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, v: boolean) => cb(v);
    ipcRenderer.on("window-maximized", handler);
    return () => ipcRenderer.removeListener("window-maximized", handler);
  },
};

contextBridge.exposeInMainWorld("desktop", desktop);
/** @deprecated Use window.desktop — kept for older bundles. */
contextBridge.exposeInMainWorld("riftDesktop", {
  minimize: () => desktop.minimize(),
  maximizeToggle: () => desktop.maximize(),
  close: () => desktop.close(),
  isMaximized: () => desktop.isMaximized(),
  onMaximizedChange: desktop.onMaximizedChange,
});
