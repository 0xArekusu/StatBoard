import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import { StatPeriod, STAT_PERIOD, STAT_PERIOD_LABELS } from '../../constants/statsConstants';

interface PeriodFilterProps {
  selected: StatPeriod;
  onChange: (period: StatPeriod) => void;
}

const PERIODS: StatPeriod[] = [STAT_PERIOD.SEASON, STAT_PERIOD.THREE_MONTHS, STAT_PERIOD.LAST_5];

export default function PeriodFilter({ selected, onChange }: PeriodFilterProps) {
  const { colors } = useTheme();
  const { sp, font } = useResponsive();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceVariant,
          borderRadius: sp.sm,
          padding: sp.xs,
          gap: sp.xs,
        },
      ]}
    >
      {PERIODS.map((period) => {
        const isActive = selected === period;
        return (
          <TouchableOpacity
            key={period}
            onPress={() => onChange(period)}
            style={[
              styles.pill,
              {
                paddingHorizontal: sp.md,
                paddingVertical: sp.xs,
                borderRadius: sp.xs,
                backgroundColor: isActive ? colors.primary : colors.transparent,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  fontSize: font.sm,
                  color: isActive ? colors.onPrimary : colors.text.secondary,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
            >
              {STAT_PERIOD_LABELS[period]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  pill: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    textAlign: 'center',
  },
});
