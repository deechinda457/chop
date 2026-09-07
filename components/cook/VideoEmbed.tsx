import WebView from 'react-native-webview';
import { StyleSheet } from 'react-native';

export function VideoEmbed({ youTubeId }: { youTubeId: string }) {
  return (
    <WebView
      source={{ uri: `https://www.youtube.com/embed/${youTubeId}?playsinline=1` }}
      style={StyleSheet.absoluteFill}
      allowsFullscreenVideo
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
    />
  );
}
