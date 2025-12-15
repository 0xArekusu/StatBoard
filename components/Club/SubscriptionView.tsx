import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/contexts/ThemeContext";
import { SLATE_COLORS, BRAND_COLORS, COMMON_COLORS } from "../../src/theme";
import { Club } from "../../models/Club";
import { SubscriptionTier, SUBSCRIPTION_LIMITS } from "../../models/Subscription";

interface SubscriptionViewProps {
  club: Club;
  onClose: () => void;
}

interface PricingCardProps {
  tier: SubscriptionTier;
  currentTier: SubscriptionTier;
  price: string;
  limit: number;
  isDark: boolean;
  onSelect: (tier: SubscriptionTier) => void;
}

function PricingCard({
  tier,
  currentTier,
  price,
  limit,
  isDark,
  onSelect,
}: PricingCardProps) {
  const isCurrent = tier === currentTier;
  const colors: Record<SubscriptionTier, string> = {
    free: SLATE_COLORS[600],
    basic: BRAND_COLORS[500],
    premium: BRAND_COLORS[600],
    ultimate: BRAND_COLORS[900],
  };

  return (
    <TouchableOpacity
      onPress={() => onSelect(tier)}
      disabled={isCurrent}
      style={[
        styles.pricingCard,
        {
          backgroundColor: isDark ? SLATE_COLORS[900] : COMMON_COLORS.white,
          borderColor: isCurrent
            ? BRAND_COLORS[500]
            : isDark
              ? SLATE_COLORS[800]
              : SLATE_COLORS[200],
          borderWidth: isCurrent ? 2 : 1,
          opacity: isCurrent ? 1 : 0.8,
        },
      ]}
    >
      {isCurrent && (
        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>ACTUEL</Text>
        </View>
      )}
      <View style={styles.pricingCardContent}>
        <View style={styles.pricingCardLeft}>
          <View style={[styles.pricingIcon, { backgroundColor: colors[tier] }]}>
            <MaterialCommunityIcons
              name={tier === "ultimate" ? "crown" : "star"}
              size={20}
              color={COMMON_COLORS.white}
            />
          </View>
          <View>
            <View style={styles.tierNameRow}>
              <Text
                style={[
                  styles.tierName,
                  { color: isDark ? COMMON_COLORS.white : SLATE_COLORS[900] },
                ]}
              >
                {tier}
              </Text>
            </View>
            <Text
              style={[
                styles.tierLimit,
                { color: isDark ? SLATE_COLORS[400] : SLATE_COLORS[500] },
              ]}
            >
              {limit > 100 ? "Équipes illimitées" : `Jusqu'à ${limit} équipes`}
            </Text>
          </View>
        </View>
        <View style={styles.pricingCardRight}>
          <Text
            style={[
              styles.priceValue,
              { color: isDark ? COMMON_COLORS.white : SLATE_COLORS[900] },
            ]}
          >
            {price}
          </Text>
          <Text style={[styles.priceLabel, { color: SLATE_COLORS[400] }]}>
            / mois
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SubscriptionView({
  club,
  onClose,
}: SubscriptionViewProps) {
  const { isDark } = useTheme();

  const currentTier: SubscriptionTier = club?.subscriptionTier || "free";

  const textPrimary = isDark ? COMMON_COLORS.white : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];

  const handleUpgrade = (tier: SubscriptionTier) => {
    if (!club) return;
    Alert.alert("Upgrade", `Confirmer le passage à l'offre ${tier} ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Confirmer",
        onPress: () => {
          // TODO: Implement payment process
          Alert.alert("Succès", "Abonnement mis à jour avec succès !");
          onClose();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.subscriptionView}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.subscriptionTitle, { color: textPrimary }]}>
          Gérez votre offre
        </Text>
        <Text style={[styles.subscriptionSubtitle, { color: textSecondary }]}>
          Passez au niveau supérieur pour ajouter plus d'équipes.
        </Text>

        <View style={styles.pricingCards}>
          <PricingCard
            tier="basic"
            currentTier={currentTier}
            price="9.99€"
            limit={SUBSCRIPTION_LIMITS.basic.maxTeams}
            isDark={isDark}
            onSelect={handleUpgrade}
          />
          <PricingCard
            tier="premium"
            currentTier={currentTier}
            price="24.99€"
            limit={SUBSCRIPTION_LIMITS.premium.maxTeams}
            isDark={isDark}
            onSelect={handleUpgrade}
          />
          <PricingCard
            tier="ultimate"
            currentTier={currentTier}
            price="49.99€"
            limit={SUBSCRIPTION_LIMITS.ultimate.maxTeams}
            isDark={isDark}
            onSelect={handleUpgrade}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subscriptionView: {
    gap: 24,
    padding: 24,
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: 8,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  subscriptionSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: -16,
  },
  pricingCards: {
    gap: 16,
  },
  pricingCard: {
    padding: 16,
    borderRadius: 16,
    position: "relative",
  },
  currentBadge: {
    position: "absolute",
    top: -12,
    left: "50%",
    transform: [{ translateX: -50 }],
    backgroundColor: BRAND_COLORS[500],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  currentBadgeText: {
    color: COMMON_COLORS.white,
    fontSize: 10,
    fontWeight: "bold",
  },
  pricingCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pricingCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  pricingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tierNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tierName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  tierLimit: {
    fontSize: 12,
    marginTop: 2,
  },
  pricingCardRight: {
    alignItems: "flex-end",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  priceLabel: {
    fontSize: 10,
  },
});
