import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type HamsterMood = 'default' | 'happy' | 'warning' | 'thinking' | 'gentle';

interface HamsterAvatarProps {
  mood?: HamsterMood;
  size?: number;
  showSpeech?: boolean;
  speechText?: string;
}

const HAMSTER_EMOJIS: Record<HamsterMood, string> = {
  default: '🐹',
  happy: '🐹',
  warning: '🐹',
  thinking: '🐹',
  gentle: '🐹',
};

// 背景色按心情区分
const MOOD_BG: Record<HamsterMood, string> = {
  default: '#FFF3E8',
  happy: '#E8F8E8',
  warning: '#FFF8E1',
  thinking: '#F0F4FF',
  gentle: '#FFE8F0',
};

export function HamsterAvatar({
  mood = 'default',
  size = 44,
  showSpeech = false,
  speechText,
}: HamsterAvatarProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: MOOD_BG[mood] }]}>
        <Text style={{ fontSize: size * 0.55 }}>{HAMSTER_EMOJIS[mood]}</Text>
      </View>
      {showSpeech && speechText ? (
        <View style={[styles.speechBubble, { backgroundColor: MOOD_BG[mood] }]}>
          <Text style={styles.speechText}>{speechText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  speechBubble: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopLeftRadius: 4,
  },
  speechText: {
    fontSize: 14,
    color: '#3D2B1F',
    lineHeight: 20,
  },
});
