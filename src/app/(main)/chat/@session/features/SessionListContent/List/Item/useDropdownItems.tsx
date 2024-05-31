// useActionItems.ts
import { Icon } from '@lobehub/ui';
import { App, MenuProps } from 'antd';
import { createStyles } from 'antd-style';
import isEqual from 'fast-deep-equal';
import {
  Check,
  HardDriveDownload,
  ListTree,
  LucideCopy,
  LucidePlus,
  Pin,
  PinOff,
  Trash,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { configService } from '@/services/config';
import { useSessionStore } from '@/store/session';
import { sessionHelpers } from '@/store/session/helpers';
import { sessionGroupSelectors, sessionSelectors } from '@/store/session/selectors';
import { SessionDefaultGroup } from '@/types/session';

const useStyles = createStyles(({ css }) => ({
  modalRoot: css`
    z-index: 2000;
  `,
}));

export interface ActionProps {
  group: string | undefined;
  id: string;
  openCreateGroupModal: () => void;
  setOpen: (open: boolean) => void;
}

export const useDropdownItems = (
  id: string,
  group: string | undefined,
  openCreateGroupModal: () => void,
): MenuProps['items'] => {
  const { styles } = useStyles();
  const { t } = useTranslation('chat');
  const sessionCustomGroups = useSessionStore(sessionGroupSelectors.sessionGroupItems, isEqual);
  const [pin, removeSession, pinSession, duplicateSession, updateSessionGroup] = useSessionStore(
    (s) => {
      const session = sessionSelectors.getSessionById(id)(s);
      return [
        sessionHelpers.getSessionPinned(session),
        s.removeSession,
        s.pinSession,
        s.duplicateSession,
        s.updateSessionGroupId,
      ];
    },
  );

  const { modal, message } = App.useApp();

  const isDefault = group === SessionDefaultGroup.Default;

  return useMemo(
    () => [
      {
        icon: <Icon icon={pin ? PinOff : Pin} />,
        key: 'pin',
        label: t(pin ? 'pinOff' : 'pin'),
        onClick: () => {
          pinSession(id, !pin);
        },
      },
      {
        icon: <Icon icon={LucideCopy} />,
        key: 'duplicate',
        label: t('duplicate', { ns: 'common' }),
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();

          duplicateSession(id);
        },
      },
      {
        type: 'divider',
      },
      {
        children: [
          ...sessionCustomGroups.map(({ id: groupId, name }) => ({
            icon: group === groupId ? <Icon icon={Check} /> : <div />,
            key: groupId,
            label: name,
            onClick: () => {
              updateSessionGroup(id, groupId);
            },
          })),
          {
            icon: isDefault ? <Icon icon={Check} /> : <div />,
            key: 'defaultList',
            label: t('defaultList'),
            onClick: () => {
              updateSessionGroup(id, SessionDefaultGroup.Default);
            },
          },
          {
            type: 'divider',
          },
          {
            icon: <Icon icon={LucidePlus} />,
            key: 'createGroup',
            label: <div>{t('sessionGroup.createGroup')}</div>,
            onClick: ({ domEvent }) => {
              domEvent.stopPropagation();
              openCreateGroupModal();
            },
          },
        ],
        icon: <Icon icon={ListTree} />,
        key: 'moveGroup',
        label: t('sessionGroup.moveGroup'),
      },
      {
        type: 'divider',
      },
      {
        children: [
          {
            key: 'agent',
            label: t('exportType.agent', { ns: 'common' }),
            onClick: () => {
              configService.exportSingleAgent(id);
            },
          },
          {
            key: 'agentWithMessage',
            label: t('exportType.agentWithMessage', { ns: 'common' }),
            onClick: () => {
              configService.exportSingleSession(id);
            },
          },
        ],
        icon: <Icon icon={HardDriveDownload} />,
        key: 'export',
        label: t('export', { ns: 'common' }),
      },
      {
        danger: true,
        icon: <Icon icon={Trash} />,
        key: 'delete',
        label: t('delete', { ns: 'common' }),
        onClick: ({ domEvent }) => {
          domEvent.stopPropagation();
          modal.confirm({
            centered: true,
            okButtonProps: { danger: true },
            onOk: async () => {
              await removeSession(id);
              message.success(t('confirmRemoveSessionSuccess'));
            },
            rootClassName: styles.modalRoot,
            title: t('confirmRemoveSessionItemAlert'),
          });
        },
      },
    ],
    [id, pin],
  );
};
