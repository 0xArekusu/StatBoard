import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import {
  LeaderCategory,
  LEADER_CATEGORY,
  getLeaderCategoryLabel,
} from '../../constants/statsConstants';

interface CategoryTabsProps {
  selected: LeaderCategory;
  onChange: (category: LeaderCategory) => void;
}

const CATEGORIES: LeaderCategory[] = [
  LEADER_CATEGORY.EFF,
  LEADER_CATEGORY.PTS,
  LEADER_CATEGORY.REB,
  LEADER_CATEGORY.REB_OFF,
  LEADER_CATEGORY.REB_DEF,
  LEADER_CATEGORY.AST,
  LEADER_CATEGORY.DEF,
  LEADER_CATEGORY.STL,
  LEADER_CATEGORY.BLK,
  LEADER_CATEGORY.TO,
  LEADER_CATEGORY.PF,
  LEADER_CATEGORY.FD,
  LEADER_CATEGORY.FG_PCT,
  LEADER_CATEGORY.FG2_PCT,
  LEADER_CATEGORY.FG3_PCT,
  LEADER_CATEGORY.FT_PCT,
];

export default function CategoryTabs({ selected, onChange }: CategoryTabsProps) {
  const { colors } = useTheme();
  const { sp, font } = useResponsive();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { gap: sp.sm, paddingHorizontal: sp.md }]}
    >
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat;
        return (
          <TouchableOpacity
            key={cat}
            onPress={() => onChange(cat)}
            style={[
              styles.tab,
              {
                paddingHorizontal: sp.md,
                paddingVertical: sp.sm,
                borderRadius: sp.sm,
                borderBottomWidth: 2,
                borderBottomColor: isActive ? colors.primary : colors.transparent,
                backgroundColor: isActive ? colors.button.brandAlpha : colors.transparent,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  fontSize: font.sm,
                  color: isActive ? colors.primary : colors.text.secondary,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
            >
              {getLeaderCategoryLabel(cat)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
  },
  label: {
    letterSpacing: 0.5,
  },
});
