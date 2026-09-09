import { invoke, isTauri } from '@tauri-apps/api/core';

export interface DesktopStorageInfo {
  root: string;
  database: string;
  workspaceId: string;
  schemaVersion: number;
  recoveredPendingFiles: number;
}

export type StorageInfo =
  | ({ kind: 'desktop' } & DesktopStorageInfo)
  | { kind: 'browser-demo'; message: string };

type InvokeCommand = <T>(command: string) => Promise<T>;

export async function loadStorageInfo(
  native = isTauri(),
  invokeCommand: InvokeCommand = invoke,
): Promise<StorageInfo> {
  if (!native) {
    return {
      kind: 'browser-demo',
      message: '浏览器演示不创建本地数据目录',
    };
  }
  const info = await invokeCommand<DesktopStorageInfo>('get_storage_info');
  return { kind: 'desktop', ...info };
}
