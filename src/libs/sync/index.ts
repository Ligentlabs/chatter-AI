import { WebrtcProvider } from 'y-webrtc';
import * as Y from 'yjs';
import { Doc } from 'yjs';

import { LocalDBInstance } from '@/database/core';
import { LobeDBSchemaMap } from '@/database/core/db';

export type OnSyncEvent = (
  tableKey: keyof LobeDBSchemaMap,
  id: string,
  payload: { action: 'add' | 'update' | 'delete' },
) => void;

interface StartDataSyncParams {
  name?: string;
  onEvent?: OnSyncEvent;
  onInit?: () => void;
  password?: string;
}
class SyncBus {
  ydoc: Doc;

  constructor() {
    this.ydoc = new Y.Doc();
  }

  getYMap = (tableKey: keyof LobeDBSchemaMap) => {
    return this.ydoc.getMap(tableKey);
  };

  loadData = async (onEvent?: OnSyncEvent) => {
    await Promise.all([
      this.loadDataFromDBtoYjs('sessions', onEvent),
      this.loadDataFromDBtoYjs('sessionGroups', onEvent),
      this.loadDataFromDBtoYjs('topics', onEvent),
      this.loadDataFromDBtoYjs('messages', onEvent),
      this.loadDataFromDBtoYjs('plugins', onEvent),
    ]);
  };

  startDataSync = async ({ name, password, onInit, onEvent }: StartDataSyncParams) => {
    // clients connected to the same room-name share document updates
    const provider = new WebrtcProvider(name || 'abc', this.ydoc, {
      password: password,
      signaling: ['wss://y-webrtc-signaling.lobehub.com'],
    });

    provider.on('synced', async () => {
      console.log('WebrtcProvider: synced');
      console.log('start init data...');
      await this.loadData(onEvent);
      onInit?.();
      console.log('yjs init success');
    });

    provider.on('peers', async (arg0) => {
      console.log(arg0);
    });
  };

  loadDataFromDBtoYjs = async (tableKey: keyof LobeDBSchemaMap, onEvent?: OnSyncEvent) => {
    const table = LocalDBInstance[tableKey];
    const items = await table.toArray();
    const yItemMap = this.ydoc.getMap(tableKey);

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
            console.log('itemInTable', itemInTable);
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

        onEvent?.(tableKey, id, payload);
      });

      await Promise.all(pools);
    });

    items.forEach((item) => {
      yItemMap.set(item.id, { ...item, _internalUpdate: true });
    });
  };
}

export const syncBus = new SyncBus();
