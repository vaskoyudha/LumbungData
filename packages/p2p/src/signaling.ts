import { compressSDP, decompressSDP } from './sdp-compress';

const STUN_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const DATA_CHANNEL_LABEL = 'lumbung-sync';

interface PeerConnectionState {
  pc: RTCPeerConnection;
  dataChannel: RTCDataChannel;
}

let activePeer: PeerConnectionState | undefined;

function waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    const checkState = (): void => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', checkState);
  });
}

/** Creates offer SDP with ICE candidates, returns compressed QR-ready string. */
export async function createOffer(): Promise<string> {
  const pc = new RTCPeerConnection(STUN_CONFIG);
  const dataChannel = pc.createDataChannel(DATA_CHANNEL_LABEL);

  activePeer = { pc, dataChannel };

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await waitForIceGathering(pc);

  const sdp = pc.localDescription?.sdp;
  if (!sdp) {
    throw new Error('Failed to generate offer SDP');
  }

  return compressSDP(sdp);
}

export async function createAnswer(offerQrData: string): Promise<string> {
  const offerSdp = await decompressSDP(offerQrData);

  const pc = new RTCPeerConnection(STUN_CONFIG);

  let resolveDataChannel: (dc: RTCDataChannel) => void;
  const dataChannelPromise = new Promise<RTCDataChannel>((resolve) => {
    resolveDataChannel = resolve;
  });

  pc.addEventListener('datachannel', (event) => {
    resolveDataChannel(event.channel);
  });

  await pc.setRemoteDescription({
    type: 'offer',
    sdp: offerSdp,
  });

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  await waitForIceGathering(pc);

  const answerSdp = pc.localDescription?.sdp;
  if (!answerSdp) {
    throw new Error('Failed to generate answer SDP');
  }

  const dataChannel = await dataChannelPromise;
  activePeer = { pc, dataChannel };

  return compressSDP(answerSdp);
}

export async function completeConnection(answerQrData: string): Promise<void> {
  if (!activePeer) {
    throw new Error('No active peer connection. Call createOffer() first.');
  }

  const answerSdp = await decompressSDP(answerQrData);

  await activePeer.pc.setRemoteDescription({
    type: 'answer',
    sdp: answerSdp,
  });
}

export function getActivePeer(): PeerConnectionState | undefined {
  return activePeer;
}

export function closePeer(): void {
  if (activePeer) {
    activePeer.dataChannel.close();
    activePeer.pc.close();
    activePeer = undefined;
  }
}
