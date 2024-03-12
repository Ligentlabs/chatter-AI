import { WebrtcProvider } from 'y-webrtc';
import { Doc } from 'yjs';

import { LocalDBInstance } from '@/database/core';
import { LobeDBSchemaMap } from '@/database/core/db';

export type OnSyncEvent = (tableKey: keyof LobeDBSchemaMap) => void;

export interface StartDataSyncParams {
  name: string;
  onEvent: OnSyncEvent;
  onSync: (status: 'syncing' | 'synced') => void;
  password?: string;
}

class SyncBus {
  ydoc: Doc;

  constructor() {
    this.ydoc = new Doc();
  }

  startDataSync = async ({ name, password, onEvent, onSync }: StartDataSyncParams) => {
    // clients connected to the same room-name share document updates
    const provider = new WebrtcProvider(name, this.ydoc, {
      password: password,
      signaling: ['wss://y-webrtc-signaling.lobehub.com'],
    });

    provider.on('synced', async ({ synced }) => {
      if (synced) {
        console.log('WebrtcProvider: synced');
        // this.initObserve(onEvent);
      }
    });

    provider.on('status', async ({ connected }) => {
      // 当开始连接，则初始化数据
      if (connected) {
        onSync?.('syncing');
        console.log('start init data...');
        this.initObserve(onEvent);
        await this.initSync();
        console.log('yjs init success');
        onSync?.('synced');
      }
    });
  };

  getYMap = (tableKey: keyof LobeDBSchemaMap) => {
    return this.ydoc.getMap(tableKey);
  };

  private initSync = async () => {
    await Promise.all(
      ['sessions', 'sessionGroups', 'topics', 'messages', 'plugins'].map(async (tableKey) => {
        return this.loadDataFromDBtoYjs(tableKey as keyof LobeDBSchemaMap);
      }),
    );
  };

  private initObserve = (onEvent: OnSyncEvent) => {
    ['sessions', 'sessionGroups', 'topics', 'messages', 'plugins'].forEach((tableKey) => {
      // listen yjs change
      this.observeYMapChange(tableKey as keyof LobeDBSchemaMap, onEvent);
    });
  };

  private observeYMapChange = (tableKey: keyof LobeDBSchemaMap, onEvent: OnSyncEvent) => {
    const table = LocalDBInstance[tableKey];
    const yItemMap = this.getYMap(tableKey);

    yItemMap.observe(async (event) => {
      // abort local change
      if (event.transaction.local) return;

      // console.log(`observe ${tableKey} changes:`, event.keysChanged.size);
      const pools = Array.from(event.keys).map(async ([id, payload]) => {
        const item: any = yItemMap.get(id);

        switch (payload.action) {
          case 'add':
          case 'update': {
            const itemInTable = await table.get(id);
            if (!itemInTable) {
              await table.add(item, id);
            } else {
              await table.update(id, item);
            }
            break;
          }

          case 'delete': {
            await table.delete(id);
            break;
          }
        }
      });

      await Promise.all(pools);
      onEvent?.(tableKey);
    });
  };

  private loadDataFromDBtoYjs = async (tableKey: keyof LobeDBSchemaMap) => {
    const table = LocalDBInstance[tableKey];
    const items = await table.toArray();
    const yItemMap = this.getYMap(tableKey);

    items.forEach((item) => {
      // TODO: 需要改表，所有 table 都需要有 id 字段
      yItemMap.set(item.id || (item as any).identifier, item);
    });
  };
}

export const syncBus = new SyncBus();
