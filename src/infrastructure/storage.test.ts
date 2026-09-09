import { describe, expect, it, vi } from 'vitest';
import { loadStorageInfo } from './storage';

describe('storage information boundary', () => {
  it('does not invoke desktop storage from the browser demo', async () => {
    const invoke = vi.fn();

    await expect(loadStorageInfo(false, invoke)).resolves.toEqual({
      kind: 'browser-demo',
      message: '浏览器演示不创建本地数据目录',
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('reads storage information through the trusted Tauri command', async () => {
    const nativeInfo = {
      root: 'C:\\Users\\JKai\\AppData\\Local\\com.careercopilot.desktop\\workspace',
      database: 'C:\\Users\\JKai\\AppData\\Local\\com.careercopilot.desktop\\workspace\\app.db',
      workspaceId: 'abc123',
      schemaVersion: 1,
      recoveredPendingFiles: 0,
    };
    const invoke = vi.fn().mockResolvedValue(nativeInfo);

    await expect(loadStorageInfo(true, invoke)).resolves.toEqual({ kind: 'desktop', ...nativeInfo });
    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith('get_storage_info');
  });
});
