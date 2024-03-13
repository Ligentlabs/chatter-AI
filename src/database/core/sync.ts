import { WebrtcProvider } from 'y-webrtc';
import { Doc } from 'yjs';



import { OnSyncEvent, StartDataSyncParams } from '@/types/sync';



import { LobeDBSchemaMap, LocalDBInstance } from './db';


let provider: WebrtcProvider;

let ydoc: Doc;
if (typeof window !== 'undefined') {
  ydoc = new Doc();
}

class SyncBus {
  private ydoc: Doc = ydoc;

  startDataSync = async ({
    channel,
    onEvent,
    onSync,
    user,
    onAwarenessChange,
    signaling = 'wss://y-webrtc-signaling.lobehub.com',
  }: StartDataSyncParams) => {
    // 如果之前实例化过，则断开
    if (provider) {
      provider.destroy();
    }

    // clients connected to the same room-name share document updates
    provider = new WebrtcProvider(channel.name, this.ydoc, {
      password: channel.password,
      signaling: [signaling],
    });

    provider.on('synced', async ({ synced }) => {
      console.log('WebrtcProvider', synced, this.getYMap('messages').size);
      if (synced) {
        onSync?.('syncing');
        await this.initSync();
        console.log('yjs init success', this.getYMap('messages').size);
        onSync?.('synced');
      }
    });

    provider.on('status', async ({ connected }) => {
      console.log('status', connected);
      // 当开始连接，则初始化数据
      if (connected) {
        console.log('start Observe...');
        this.initObserve(onEvent);
      }
    });

    const awareness = provider.awareness;

    awareness.setLocalState({ clientID: awareness.clientID, user });

    awareness.on('change', () => {
      const state = Array.from(awareness.getStates().values()).map((s) => ({
        ...s.user,
        clientID: s.clientID,
        current: s.clientID === awareness.clientID,
      }));

      onAwarenessChange?.(state);
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

      console.log(`observe ${tableKey} changes:`, event.keysChanged.size);
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
