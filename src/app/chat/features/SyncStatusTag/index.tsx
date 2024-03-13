import { Avatar, Icon } from '@lobehub/ui';
import { Popover, Tag, Typography } from 'antd';
import { createStyles, useTheme } from 'antd-style';
import isEqual from 'fast-deep-equal';
import { LucideCheck, LucideLaptop, LucideRefreshCw, LucideSmartphone } from 'lucide-react';
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
  const users = useGlobalStore((s) => s.syncAwareness, isEqual);

  const theme = useTheme();
  return (
    syncEnabled && (
      <Popover
        arrow={false}
        content={
          <Flexbox gap={12}>
            {users.map((user) => (
              <Flexbox gap={12} horizontal key={user.clientID}>
                <Avatar
                  avatar={
                    <Icon
                      color={theme.purple}
                      icon={user.isMobile ? LucideSmartphone : LucideLaptop}
                      size={{ fontSize: 24 }}
                    />
                  }
                  background={theme.purple1}
                  shape={'square'}
                />

                <Flexbox>
                  <Flexbox gap={8} horizontal>
                    {user.name || user.id}
                    {user.current && (
                      <Tag bordered={false} color={'blue'}>
                        current
                      </Tag>
                    )}
                  </Flexbox>
                  <Typography.Text type={'secondary'}>
                    {user.device} · {user.os} · {user.browser}
                  </Typography.Text>
                </Flexbox>
              </Flexbox>
            ))}
          </Flexbox>
        }
        open
        placement={'bottomLeft'}
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
