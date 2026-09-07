import Svg, { Path } from 'react-native-svg';

// The brand mark (bowl + steam curling into a checkmark) -- reused quietly
// beyond the logo itself, per CLAUDE.md, in Cook Mode's progress ring and its
// completion screen.
export function BowlCheckmarkMark({ size = 36, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12a8 8 0 0 0 16 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M2 12h20" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M9.5 12.5l2 2 4-4.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
