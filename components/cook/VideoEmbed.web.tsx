// react-native-webview has no real web implementation, so the web/PWA build
// uses a plain iframe instead -- same YouTube embed URL, native DOM element.
export function VideoEmbed({ youTubeId }: { youTubeId: string }) {
  return (
    <iframe
      src={`https://www.youtube.com/embed/${youTubeId}?playsinline=1`}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}
