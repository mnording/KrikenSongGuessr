// Det vi använder av Spotify Web Playback SDK.
export {};

declare global {
  namespace Spotify {
    type Track = { uri: string; name: string };

    type PlaybackState = {
      paused: boolean;
      position: number;
      duration: number;
      track_window: { current_track: Track | null };
    };

    type Events = {
      ready: { device_id: string };
      not_ready: { device_id: string };
      player_state_changed: PlaybackState | null;
      autoplay_failed: void;
      initialization_error: { message: string };
      authentication_error: { message: string };
      account_error: { message: string };
      playback_error: { message: string };
    };

    interface Player {
      connect(): Promise<boolean>;
      disconnect(): void;
      activateElement(): Promise<void>;
      pause(): Promise<void>;
      resume(): Promise<void>;
      togglePlay(): Promise<void>;
      addListener<E extends keyof Events>(event: E, callback: (data: Events[E]) => void): boolean;
      removeListener<E extends keyof Events>(event: E, callback?: (data: Events[E]) => void): boolean;
    }
  }

  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        volume?: number;
        getOAuthToken: (callback: (token: string) => void) => void;
      }) => Spotify.Player;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}
