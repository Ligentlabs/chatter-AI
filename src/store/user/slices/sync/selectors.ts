import { UserStore } from '../../store';
import { currentSettings } from '../settings/selectors/settings';

const webrtcConfig = (s: UserStore) => currentSettings(s).sync.webrtc;
const webrtcChannelName = (s: UserStore) => webrtcConfig(s).channelName;
const enableWebRTC = (s: UserStore) => webrtcConfig(s).enabled;
const liveblocksConfig = (s: UserStore) => currentSettings(s).sync.liveblocks;
const liveblocksRoomName = (s: UserStore) => liveblocksConfig(s).roomName;
const enableLiveblocks = (s: UserStore) => liveblocksConfig(s).enabled;
const deviceName = (s: UserStore) => currentSettings(s).sync.deviceName;

export const syncSettingsSelectors = {
  deviceName,
  enableLiveblocks,
  enableWebRTC,
  liveblocksConfig,
  liveblocksRoomName,
  webrtcChannelName,
  webrtcConfig,
};
