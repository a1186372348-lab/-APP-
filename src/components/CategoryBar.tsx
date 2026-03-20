import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CategoryBarProps {
  name: string;
  icon: string;
  amountCents: number;
  percentage: number;
  color: string;
}

export function CategoryBar({ name, icon, amountCents, percentage, color }: CategoryBarProps) {
  const yuan = (amountCents / 100).toFixed(0);

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.barContainer}>
          <View style={[styles.bar, { width: `${Math.min(100, percentage)}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.amount}>¥{yuan}</Text>
        <Text style={styles.pct}>{percentage.toFixed(0)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 16,
    width: 22,
  },
  name: {
    fontSize: 14,
    color: '#3D2B1F',
    width: 40,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0EAE0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  amount: {
    fontSize: 13,
    color: '#3D2B1F',
    fontWeight: '600',
    width: 60,
    textAlign: 'right',
  },
  pct: {
    fontSize: 12,
    color: '#888',
    width: 36,
    textAlign: 'right',
  },
});
