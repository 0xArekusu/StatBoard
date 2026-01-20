/**
 * SubscriptionView Component
 *
 * Displays subscription tiers and allows users to upgrade their club subscription plan.
 * Supports dark/light mode and shows the current active subscription tier.
 */

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

/** Props for the main SubscriptionView component */
interface SubscriptionViewProps {
  /** The club whose subscription is being managed */
  club: Club;
  /** Callback to close the subscription view */
  onClose: () => void;
}

/** Props for individual pricing card display */
interface PricingCardProps {
  /** The subscription tier this card represents */
  tier: SubscriptionTier;
  /** The club's current active subscription tier */
  currentTier: SubscriptionTier;
  /** Price to display for this tier */
  price: string;
  /** Maximum number of teams allowed for this tier */
  limit: number;
  /** Theme colors from useTheme */
  colors: any;
  /** Callback when user selects this tier */
  onSelect: (tier: SubscriptionTier) => void;
}

/**
 * PricingCard Component
 *
 * Displays a single subscription tier option with its price, team limit, and visual styling.
 * Shows a badge if this is the club's current tier.
 */
function PricingCard({
  tier,
  currentTier,
  price,
  limit,
  colors,
  onSelect,
}: PricingCardProps) {
  // Check if this card represents the current subscription
  const isCurrent = tier === currentTier;

  // Color scheme for each tier's icon
  const iconColors: Record<SubscriptionTier, string> = {
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
          // Adapt background color based on theme
          backgroundColor: colors.surface,
          // Highlight current tier with brand color, otherwise use subtle border
          borderColor: isCurrent ? colors.primary : colors.border,
          borderWidth: isCurrent ? 2 : 1,
          opacity: isCurrent ? 1 : 0.8,
        },
      ]}
    >
      {/* Show "Current" badge for active subscription */}
      {isCurrent && (
        <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.currentBadgeText, { color: colors.onPrimary }]}>
            ACTUEL
          </Text>
        </View>
      )}
      <View style={styles.pricingCardContent}>
        {/* Left section: Icon and tier details */}
        <View style={styles.pricingCardLeft}>
          <View style={[styles.pricingIcon, { backgroundColor: iconColors[tier] }]}>
            <MaterialCommunityIcons
              name={tier === "ultimate" ? "crown" : "star"}
              size={20}
              color={COMMON_COLORS.white}
            />
          </View>
          <View>
            <View style={styles.tierNameRow}>
              <Text style={[styles.tierName, { color: colors.text.primary }]}>
                {tier}
              </Text>
            </View>
            <Text style={[styles.tierLimit, { color: colors.text.secondary }]}>
              {limit > 100 ? "Équipes illimitées" : `Jusqu'à ${limit} équipes`}
            </Text>
          </View>
        </View>
        {/* Right section: Price */}
        <View style={styles.pricingCardRight}>
          <Text style={[styles.priceValue, { color: colors.text.primary }]}>
            {price}
          </Text>
          <Text style={[styles.priceLabel, { color: colors.text.tertiary }]}>
            / mois
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * SubscriptionView Main Component
 *
 * Manages the subscription management interface for a club.
 * Displays available subscription tiers and handles upgrade flow.
 */
export default function SubscriptionView({
  club,
  onClose,
}: SubscriptionViewProps) {
  // Get theme context for dark/light mode support
  const { colors } = useTheme();

  // Get the club's current subscription tier
  const currentTier: SubscriptionTier = club?.subscriptionTier || "free";

  // Get theme-aware colors
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  /**
   * Handles subscription upgrade requests
   * @param tier - The target subscription tier
   */
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.subscriptionView}>
        {/* Close button */}
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={textPrimary} />
        </TouchableOpacity>

        {/* Header section */}
        <Text style={[styles.subscriptionTitle, { color: textPrimary }]}>
          Gérez votre offre
        </Text>
        <Text style={[styles.subscriptionSubtitle, { color: textSecondary }]}>
          Passez au niveau supérieur pour ajouter plus d'équipes.
        </Text>

        {/* Pricing cards for available subscription tiers */}
        <View style={styles.pricingCards}>
          <PricingCard
            tier="basic"
            currentTier={currentTier}
            price="9.99€"
            limit={SUBSCRIPTION_LIMITS.basic.maxTeams}
            colors={colors}
            onSelect={handleUpgrade}
          />
          <PricingCard
            tier="premium"
            currentTier={currentTier}
            price="24.99€"
            limit={SUBSCRIPTION_LIMITS.premium.maxTeams}
            colors={colors}
            onSelect={handleUpgrade}
          />
          <PricingCard
            tier="ultimate"
            currentTier={currentTier}
            price="49.99€"
            limit={SUBSCRIPTION_LIMITS.ultimate.maxTeams}
            colors={colors}
            onSelect={handleUpgrade}
          />
        </View>
      </View>
    </ScrollView>
  );
}

/** StyleSheet for the subscription view and pricing cards */
const styles = StyleSheet.create({
  /** Main scrollable container */
  container: {
    flex: 1,
  },
  /** Subscription view wrapper with padding and spacing */
  subscriptionView: {
    gap: 24,
    padding: 24,
  },
  /** Close button positioned in top-right corner */
  closeButton: {
    alignSelf: "flex-end",
    padding: 8,
  },
  /** Main title text */
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  /** Subtitle text below main title */
  subscriptionSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: -16,
  },
  /** Container for all pricing cards */
  pricingCards: {
    gap: 16,
  },
  /** Individual pricing card container */
  pricingCard: {
    padding: 16,
    borderRadius: 16,
    position: "relative",
  },
  /** Badge showing "ACTUEL" for current subscription */
  currentBadge: {
    position: "absolute",
    top: -12,
    left: "50%",
    transform: [{ translateX: -50 }],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  /** Text inside the current badge */
  currentBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  /** Main content layout for pricing card */
  pricingCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  /** Left section containing icon and tier info */
  pricingCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  /** Circular icon background */
  pricingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  /** Row containing tier name */
  tierNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  /** Tier name text style */
  tierName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  /** Team limit description text */
  tierLimit: {
    fontSize: 12,
    marginTop: 2,
  },
  /** Right section containing price */
  pricingCardRight: {
    alignItems: "flex-end",
  },
  /** Price value text */
  priceValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  /** "/ mois" label text */
  priceLabel: {
    fontSize: 10,
  },
});
