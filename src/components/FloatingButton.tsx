import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface FloatingButtonProps {
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function FloatingButton({ onPress }: FloatingButtonProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.9, {}, () => {
      scale.value = withSpring(1);
    });
    onPress();
  };

  return (
    <AnimatedTouchable style={[styles.button, animStyle]} onPress={handlePress} activeOpacity={0.85}>
      <Text style={styles.plus}>＋</Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  plus: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 32,
    marginTop: -2,
  },
});
