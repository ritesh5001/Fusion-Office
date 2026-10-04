import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { deleteAllOutputs, deleteFile, type SavedFile } from "./files";

/** Results made on this device, newest first. Stored only on the device. */
export interface Recent extends SavedFile {
  id: string;
  tool: string;
  toolName: string;
  at: number;
}

const KEY = "fo-recents";
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

async function read(): Promise<Recent[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]");
  } catch {
    return [];
  }
}

export async function addRecent(file: SavedFile, tool: string, toolName: string) {
  const list = await read();
  const item: Recent = { ...file, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, tool, toolName, at: Date.now() };
  await AsyncStorage.setItem(KEY, JSON.stringify([item, ...list].slice(0, 100)));
  notify();
  return item;
}

export async function removeRecent(id: string) {
  const list = await read();
  const hit = list.find((r) => r.id === id);
  if (hit) deleteFile(hit.uri);
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter((r) => r.id !== id)));
  notify();
}

/** Deletes every result file and the history. */
export async function clearRecents() {
  deleteAllOutputs();
  await AsyncStorage.removeItem(KEY);
  notify();
}

export function useRecents() {
  const [items, setItems] = useState<Recent[] | null>(null);
  const load = useCallback(() => {
    read().then(setItems);
  }, []);
  useEffect(() => {
    load();
    listeners.add(load);
    return () => {
      listeners.delete(load);
    };
  }, [load]);
  return items;
}
