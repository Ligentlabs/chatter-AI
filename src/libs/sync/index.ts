import isEqual from 'fast-deep-equal';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebrtcProvider } from 'y-webrtc';
import * as Y from 'yjs';
import { Doc, Map } from 'yjs';

import { LocalDBInstance } from '@/database/core';
import { LobeDBSchemaMap } from '@/database/core/db';

interface StartDataSyncParams {
  name?: string;
  onInit?: () => void;
  password?: string;
}
class SyncBus {
  private ydoc: Doc;

  constructor() {
    this.ydoc = new Y.Doc();
  }

  startDataSync = async ({ name, password, onInit }: StartDataSyncParams) => {
    // this.loadDataFromDBtoYjs('users');
    // if need file should dependon the file module
    // this.loadDataFromDBtoYjs('files');

    console.log('start init yjs...');
    await Promise.all([
      this.loadDataFromDBtoYjs('sessions'),
      this.loadDataFromDBtoYjs('sessionGroups'),
      this.loadDataFromDBtoYjs('topics'),
      this.loadDataFromDBtoYjs('messages'),
      this.loadDataFromDBtoYjs('plugins'),
    ]);
    onInit?.();
    console.log('yjs init success');

    // clients connected to the same room-name share document updates
    const provider = new WebrtcProvider(name || 'abc', this.ydoc, {
      password: password,
    });

    const persistence = new IndexeddbPersistence('lobechat-data-sync', this.ydoc);

    provider.on('synced', () => {
      console.log('WebrtcProvider: synced');
    });

    persistence.on('synced', () => {
      console.log('IndexeddbPersistence: synced');
    });
  };

  internalUpdateYMap = (ymap: Map<any>, key: string, item: any) => {
    ymap.set(key, { ...item, _internalUpdate: true });
  };

  loadDataFromDBtoYjs = async (tableKey: keyof LobeDBSchemaMap) => {
    const table = LocalDBInstance[tableKey];
    const items = await table.toArray();
    const yItemMap = this.ydoc.getMap(tableKey);
    items.forEach((item) => {
      this.internalUpdateYMap(yItemMap, item.id, item);
    });

    table.hook('creating', (primaryKey, item) => {
      console.log(tableKey, 'creating', primaryKey, item);
      yItemMap.set(primaryKey, item);
    });
    table.hook('updating', (item, primaryKey) => {
      console.log('[DB]', tableKey, 'updating', primaryKey, item);
      yItemMap.set(primaryKey, item);
    });
    table.hook('deleting', (primaryKey) => {
      console.log(tableKey, 'deleting', primaryKey);
      yItemMap.delete(primaryKey);
    });

    yItemMap.observe(async (event) => {
      // abort local change
      if (event.transaction.local) return;

      console.log(tableKey, ':', event.keysChanged);
      const pools = Array.from(event.keys).map(async ([id, payload]) => {
        const item: any = yItemMap.get(id);

        if (item._internalUpdate) {
          return;
        }

        switch (payload.action) {
          case 'add': {
            console.log('新增：', payload);

            break;
          }
          case 'update': {
            console.log(id, payload.newValue, payload.oldValue);
            const item: any = yItemMap.get(id);
            console.log('nextValue', item);
            const current = await table.get(id);

            // 如果相等则不更新
            if (isEqual(item, current)) return;

            await table.update(id, item);
            break;
          }
          case 'delete': {
            break;
          }
        }
      });

      await Promise.all(pools);
    });
  };
}

export const syncBus = new SyncBus();
