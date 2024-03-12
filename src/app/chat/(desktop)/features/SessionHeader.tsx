import { ActionIcon, Icon, Logo } from '@lobehub/ui';
import { Tag } from 'antd';
import { createStyles } from 'antd-style';
import { LucideCheck, LucideRefreshCw, MessageSquarePlus } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { DESKTOP_HEADER_ICON_SIZE } from '@/const/layoutTokens';
import { useGlobalStore } from '@/store/global';
import { useSessionStore } from '@/store/session';

import SessionSearchBar from '../../features/SessionSearchBar';

export const useStyles = createStyles(({ css, token }) => ({
  logo: css`
    fill: ${token.colorText};
  `,
  top: css`
    position: sticky;
    top: 0;
  `,
}));

const Header = memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('chat');
  const [createSession] = useSessionStore((s) => [s.createSession]);
  const [isSyncing, syncEnabled] = useGlobalStore((s) => [
    s.syncStatus === 'syncing',
    s.syncEnabled,
  ]);

  return (
    <Flexbox className={styles.top} gap={16} padding={16}>
      <Flexbox distribution={'space-between'} horizontal>
        <Flexbox align={'center'} gap={4} horizontal>
          <Logo className={styles.logo} size={36} type={'text'} />
          {syncEnabled && (
            <Tag
              bordered={false}
              color={isSyncing ? 'blue' : 'green'}
              icon={<Icon icon={isSyncing ? LucideRefreshCw : LucideCheck} spin={isSyncing} />}
            >
              同步
            </Tag>
          )}
        </Flexbox>
        <ActionIcon
          icon={MessageSquarePlus}
          onClick={() => createSession()}
          size={DESKTOP_HEADER_ICON_SIZE}
          style={{ flex: 'none' }}
          title={t('newAgent')}
        />
      </Flexbox>
      <SessionSearchBar />
    </Flexbox>
  );
});

export default Header;
