import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import { PlayerSeasonData } from '../../src/services/seasonStats';
import { ShootingBar, StatBox, MarkerType } from '../MatchDetails/SharedComponents';
import { getActionColor, ActionType, ReboundSpecification } from '../../src/models/ActionTypes';

interface PlayerSeasonStatsProps {
  player: PlayerSeasonData;
}

export default function PlayerSeasonStats({ player }: PlayerSeasonStatsProps) {
  const { colors } = useTheme();
  const { sp, font } = useResponsive();

  const n = player.matchesPlayed || 1;
  const avgPm = 0; // +/- not computable from compacted actions

  const formatTime = (totalSeconds: number, matchCount: number): string => {
    const avgSec = Math.round(totalSeconds / matchCount);
    const m = Math.floor(avgSec / 60);
    const s = avgSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={{ gap: sp.lg }}>
      {/* 4 stat cards */}
      <View style={[styles.cardGrid, { gap: sp.sm, paddingHorizontal: sp.md }]}>
        {[
          {
            value: player.matchesWithTrackedTime > 0
              ? formatTime(player.totalPlayingTimeSeconds, player.matchesWithTrackedTime)
              : '--:--',
            label: 'Temps moy.',
          },
          { value: player.avgPts.toFixed(1), label: 'Points' },
          { value: avgPm === 0 ? '—' : (avgPm > 0 ? `+${avgPm}` : `${avgPm}`), label: '+/-' },
        ].map(({ value, label }) => (
          <View
            key={label}
            style={[
              styles.card,
              { backgroundColor: colors.surfaceVariant, padding: sp.md },
            ]}
          >
            <Text style={[styles.cardValue, { fontSize: font.xxl, color: colors.text.primary }]}>
              {value}
            </Text>
            <Text style={[styles.cardLabel, { fontSize: font.xs, color: colors.text.secondary }]}>
              {label}
            </Text>
          </View>
        ))}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceVariant,
              padding: sp.md,
              borderWidth: 2,
              borderColor: colors.primary,
            },
          ]}
        >
          <Text style={[styles.cardValue, { fontSize: font.xxl, color: colors.primary }]}>
            {player.avgEff.toFixed(1)}
          </Text>
          <Text style={[styles.cardLabel, { fontSize: font.xs, color: colors.primary }]}>
            Éval
          </Text>
        </View>
      </View>

      {/* Shooting */}
      <View style={{ paddingHorizontal: sp.md }}>
        <Text
          style={[styles.sectionTitle, { fontSize: font.md, color: colors.text.primary, marginBottom: sp.sm }]}
        >
          Performance aux tirs
        </Text>
        <View
          style={[
            styles.shootingCard,
            { backgroundColor: colors.surface, padding: sp.lg, borderRadius: sp.sm },
          ]}
        >
          <ShootingBar label="3 Points" made={player.fg3m} attempted={player.fg3a} color="#6366f1" />
          <ShootingBar label="2 Points" made={player.fg2m} attempted={player.fg2a} color="#3b82f6" />
          <ShootingBar label="Lancers" made={player.ftm} attempted={player.fta} color="#06b6d4" />
          <View style={[styles.summary, { borderTopColor: colors.border, marginTop: sp.sm, paddingTop: sp.sm }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.text.primary, fontSize: font.md }]}>
                {player.fgm}/{player.fga}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.text.tertiary, fontSize: font.xs }]}>
                TOTAL TIRS
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.text.primary, fontSize: font.md }]}>
                {player.fga > 0 ? Math.round((player.fgm / player.fga) * 100) : 0}%
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.text.tertiary, fontSize: font.xs }]}>
                RÉUSSITE
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Detailed stat boxes */}
      <View>
        <Text
          style={[
            styles.sectionTitle,
            { fontSize: font.md, color: colors.text.primary, marginBottom: sp.sm, paddingHorizontal: sp.md },
          ]}
        >
          Détails
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.boxesRow, { paddingHorizontal: sp.md, gap: sp.sm }]}
        >
          <StatBox
            label="REB OFF/DEF"
            value={`${(player.reb_off / n).toFixed(1)}/${(player.reb_def / n).toFixed(1)}`}
            sub="Rebonds moy."
            leftMarkerType={MarkerType.TRIANGLE}
            leftMarkerColor={getActionColor(ActionType.REBOUND, ReboundSpecification.OFFENSIVE, 0)}
            markerType={MarkerType.TRIANGLE}
            markerColor={getActionColor(ActionType.REBOUND, ReboundSpecification.DEFENSIVE, 0)}
          />
          <StatBox label="AST" value={(player.ast / n).toFixed(1)} sub="Passes moy." markerType={MarkerType.CIRCLE} markerColor={getActionColor(ActionType.ASSIST, '', 0)} />
          <StatBox label="INT" value={(player.stl / n).toFixed(1)} sub="Interceptions moy." markerType={MarkerType.CIRCLE} markerColor={getActionColor(ActionType.STEAL, '', 0)} />
          <StatBox label="CTR" value={(player.blk / n).toFixed(1)} sub="Contres moy." markerType={MarkerType.CIRCLE} markerColor={getActionColor(ActionType.BLOCK, '', 0)} />
          <StatBox label="BP" value={(player.to / n).toFixed(1)} sub="Balles perdues moy." markerType={MarkerType.CIRCLE} markerColor={getActionColor(ActionType.TURNOVER, '', 0)} />
          <StatBox label="FTE" value={(player.pf / n).toFixed(1)} sub="Fautes moy." markerType={MarkerType.DIAMOND} markerColor={getActionColor(ActionType.FOUL, '', 0)} />
          <StatBox label="FP" value={(player.fd / n).toFixed(1)} sub="Fautes provoquées moy." markerType={MarkerType.DIAMOND} markerColor={getActionColor(ActionType.FOUL_DRAWN, '', 0)} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardGrid: {
    flexDirection: 'row',
  },
  card: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
  },
  cardValue: {
    fontWeight: '800',
  },
  cardLabel: {
    fontWeight: '600',
    marginTop: 2,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  shootingCard: {
    borderRadius: 8,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    fontWeight: '700',
  },
  summaryLabel: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  boxesRow: {
    flexDirection: 'row',
  },
});
