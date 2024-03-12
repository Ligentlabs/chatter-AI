import { Icon } from '@lobehub/ui';
import { Popover, Tag } from 'antd';
import { createStyles } from 'antd-style';
import { LucideCheck, LucideRefreshCw } from 'lucide-react';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useGlobalStore } from '@/store/global';

export const useStyles = createStyles(({ css, token }) => ({
  logo: css`
    fill: ${token.colorText};
  `,
  top: css`
    position: sticky;
    top: 0;
  `,
}));

const SyncStatusTag = memo(() => {
  const [isSyncing, syncEnabled] = useGlobalStore((s) => [
    s.syncStatus === 'syncing',
    s.syncEnabled,
  ]);

  return (
    syncEnabled && (
      <Popover
        content={
          <Flexbox>
            <div>同步中</div>
          </Flexbox>
        }
        open
      >
        <Tag
          bordered={false}
          color={isSyncing ? 'blue' : 'green'}
          icon={<Icon icon={isSyncing ? LucideRefreshCw : LucideCheck} spin={isSyncing} />}
        >
          同步
        </Tag>
      </Popover>
    )
  );
});

export default SyncStatusTag;
