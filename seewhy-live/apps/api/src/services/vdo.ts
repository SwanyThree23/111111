export interface VdoNinjaOptions {
  room: string;
  streamId?: string;
  bitrate?: number;
  codec?: string;
  label?: string;
  scene?: boolean;
  director?: boolean;
  push?: boolean;
  view?: string;
  solo?: boolean;
  audioOnly?: boolean;
  vst?: boolean;
  vstMode?: 'publish' | 'receive';
  faderLevel?: number;
}

const BASE_URL = 'https://vdo.ninja';

export function buildVdoUrl(opts: VdoNinjaOptions): string {
  const params = new URLSearchParams();
  params.set('room', opts.room);

  if (opts.director) {
    params.set('director', opts.room);
    return `${BASE_URL}/?${params.toString()}`;
  }

  if (opts.push) {
    params.set('push', opts.streamId ?? opts.room);
    if (opts.bitrate) params.set('bitrate', String(opts.bitrate));
    if (opts.codec) params.set('codec', opts.codec);
    if (opts.label) params.set('label', opts.label);
    if (opts.audioOnly) params.set('audioonly', '1');
    if (opts.vst) {
      params.set('vst', '1');
      if (opts.vstMode === 'receive') params.set('receive', '1');
      if (opts.faderLevel !== undefined) params.set('fader', String(opts.faderLevel));
    }
    return `${BASE_URL}/?${params.toString()}`;
  }

  if (opts.view) {
    params.set('view', opts.view);
    if (opts.solo) params.set('solo', '1');
    return `${BASE_URL}/?${params.toString()}`;
  }

  if (opts.scene) {
    params.set('scene', '1');
    return `${BASE_URL}/?${params.toString()}`;
  }

  return `${BASE_URL}/?${params.toString()}`;
}

export function buildGuestInviteUrl(room: string, streamId: string, displayName?: string): string {
  return buildVdoUrl({ room, streamId, push: true, label: displayName, bitrate: 2500 });
}

export function buildDirectorUrl(room: string): string {
  return buildVdoUrl({ room, director: true });
}

export function buildSceneUrl(room: string): string {
  return buildVdoUrl({ room, scene: true });
}

export function buildVstPushUrl(room: string, trackId: string, faderLevel: number): string {
  return buildVdoUrl({ room, streamId: trackId, push: true, audioOnly: true, vst: true, vstMode: 'publish', faderLevel });
}

export function buildVstReceiveUrl(room: string, trackId: string, faderLevel: number): string {
  return buildVdoUrl({ room, streamId: trackId, push: true, audioOnly: true, vst: true, vstMode: 'receive', faderLevel });
}
