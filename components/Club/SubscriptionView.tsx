/**
 * SubscriptionView Component
 *
 * Displays subscription tiers and allows users to upgrade their club subscription plan.
 * Supports dark/light mode and shows the current active subscription tier.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../src/contexts/ThemeContext";
import { SLATE_COLORS, BRAND_COLORS, COMMON_COLORS } from "../../src/theme";
import { Club } from "../../models/Club";
import { SubscriptionTier, SubscriptionLimits } from "../../models/Subscription";
import { Team } from "../../models/Team";
import { ServiceFactory } from "../../services/ServiceFactory";
import { supabase } from "../../src/config/supabase";
import TeamSelectionModal from "./TeamSelectionModal";
import { showErrorAlert } from "../../utils/errorAlert";
import { ANALYTICS_EVENTS } from "../../constants/analyticsEvents";
import { usePostHog } from "posthog-react-native";

/** Props for the main SubscriptionView component */
interface SubscriptionViewProps {
  /** The club whose subscription is being managed */
  club: Club;
  /** Callback to close the subscription view */
  onClose: () => void;
  /** Callback when subscription is updated */
  onSubscriptionUpdated?: (updatedClub: Club) => void;
}

/** Props for individual pricing card display */
interface PricingCardProps {
  /** The subscription tier this card represents */
  tier: SubscriptionTier;
  /** The club's current active subscription tier */
  currentTier: SubscriptionTier;
  /** Price to display for this tier */
  price: number;
  /** Maximum number of teams allowed for this tier */
  limit: number;
  /** Display name for the tier */
  name?: string;
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
  name,
  colors,
  onSelect,
}: PricingCardProps) {
  const { t } = useTranslation();
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
            {t("subscriptionView.currentBadge")}
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
                {name || tier}
              </Text>
            </View>
            <Text style={[styles.tierLimit, { color: colors.text.secondary }]}>
              {limit > 100 ? t("subscriptionView.unlimitedTeams") : t("subscriptionView.upToTeams", { count: limit })}
            </Text>
          </View>
        </View>
        {/* Right section: Price */}
        <View style={styles.pricingCardRight}>
          <Text style={[styles.priceValue, { color: colors.text.primary }]}>
            {price > 0 ? `${price.toFixed(2)}€` : t("subscriptionView.free")}
          </Text>
          {price > 0 && (
            <Text style={[styles.priceLabel, { color: colors.text.tertiary }]}>
              {t("subscriptionView.perMonth")}
            </Text>
          )}
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
  onSubscriptionUpdated,
}: SubscriptionViewProps) {
  const { t } = useTranslation();
  // Get theme context for dark/light mode support
  const { colors } = useTheme();
  const posthog = usePostHog();

  // State for subscription data
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Array<{
    tier: SubscriptionTier;
    limits: SubscriptionLimits;
  }>>([]);

  // State for team selection modal
  const [showTeamSelectionModal, setShowTeamSelectionModal] = useState(false);
  const [pendingTier, setPendingTier] = useState<SubscriptionTier | null>(null);
  const [activeTeams, setActiveTeams] = useState<Team[]>([]);
  const [requireExactSelection, setRequireExactSelection] = useState(true);

  // Get the club's current subscription tier
  const currentTier: SubscriptionTier = club?.subscriptionTier || "free";

  // Get theme-aware colors
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;

  // Load subscription plans from database
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const subscriptionService = ServiceFactory.getSubscriptionService(supabase);

        // Fetch all plans from database
        const allPlans = await subscriptionService.getAllPlans();
        setPlans(allPlans);
      } catch (error) {
        console.error("Error loading subscription plans:", error);
        // Keep default fallback values (empty array, will be handled by service)
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  /**
   * Handles subscription upgrade/downgrade requests
   * @param tier - The target subscription tier
   */
  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (!club) return;

    // Get the new tier's max teams limit
    const targetPlan = plans.find(p => p.tier === tier);
    if (!targetPlan) {
      Alert.alert(t("common.error"), t("subscriptionView.planNotFound"));
      return;
    }

    const newMaxTeams = targetPlan.limits.maxTeams;

    // Check if team selection is needed
    try {
      const teamService = ServiceFactory.getTeamService(supabase);
      const teams = await teamService.getClubTeamsByStatus(club.id, "approved");
      const activeTeamsList = teams.filter(t => t.isActive && !t.isDeleted);
      const suspendedTeamsList = teams.filter(t => !t.isActive && !t.isDeleted);
      const totalTeams = activeTeamsList.length + suspendedTeamsList.length;

      // CASE 1: Downgrade - active teams exceed new limit
      if (activeTeamsList.length > newMaxTeams) {
        setPendingTier(tier);
        setActiveTeams(activeTeamsList);
        setRequireExactSelection(true); // Must select exactly maxSelection teams
        setShowTeamSelectionModal(true);
      }
      // CASE 2: Upgrade with suspended teams - let user choose which to reactivate
      else if (suspendedTeamsList.length > 0 && newMaxTeams > 0 && totalTeams > newMaxTeams) {
        // User has suspended teams and new limit allows some but not all
        setPendingTier(tier);
        setActiveTeams([...activeTeamsList, ...suspendedTeamsList]); // Show all teams
        setRequireExactSelection(false); // Can select up to maxSelection teams
        setShowTeamSelectionModal(true);
      }
      // CASE 3: No selection needed
      else {
        confirmSubscriptionChange(tier);
      }
    } catch (error) {
      console.error("Error checking team count:", error);
      Alert.alert(t("common.error"), t("subscriptionView.cannotCheckTeamCount"));
    }
  };

  /**
   * Confirm subscription change after team selection (if needed)
   */
  const confirmSubscriptionChange = (tier: SubscriptionTier, selectedTeamIds?: string[]) => {
    Alert.alert(t("subscriptionView.changeAlert.title"), t("subscriptionView.changeAlert.message", { tier }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("subscriptionView.changeAlert.confirmButton"),
        onPress: async () => {
          try {
            setLoading(true);

            // TODO: Implement payment process here
            // For now, we just update the tier directly
            const clubService = ServiceFactory.getClubService(supabase);
            const result = await clubService.updateSubscriptionTier(club.id, tier);

            if (result.success && result.club) {
              // Apply team limits and handle activation/suspension
              const targetPlan = plans.find(p => p.tier === tier);
              let message = t("subscriptionView.updateSuccess");

              if (targetPlan) {
                const teamService = ServiceFactory.getTeamService(supabase);
                const limitResult = await teamService.enforceTeamLimits(
                  club.id,
                  targetPlan.limits.maxTeams,
                  selectedTeamIds
                );

                // Build success message with team info
                if (limitResult.success) {
                  if (limitResult.reactivatedCount && limitResult.reactivatedCount > 0) {
                    message += `\n\n${t("subscriptionView.teamsReactivated", { count: limitResult.reactivatedCount })}`;
                  }
                  if (limitResult.suspendedCount && limitResult.suspendedCount > 0) {
                    message += `\n\n${t("subscriptionView.teamsSuspended", { count: limitResult.suspendedCount })}`;
                  }
                }
              }

              // Notify parent component to refresh club data
              if (onSubscriptionUpdated) {
                onSubscriptionUpdated(result.club);
              }

              posthog?.capture(ANALYTICS_EVENTS.SUBSCRIPTION_UPGRADED, {
                from_tier: club.subscriptionTier,
                to_tier: tier,
              });

              Alert.alert(t("common.success"), message);
              onClose();
            } else {
              showErrorAlert({
                messageKey: "subscriptionView.errors.updateFailed",
                error: new Error(result.error || t("subscriptionView.errors.updateFailed")),
                context: "SubscriptionView",
              });
            }
          } catch (error) {
            console.error("Error updating subscription:", error);
            showErrorAlert({
              messageKey: "subscriptionView.errors.updateFailed",
              error,
              context: "SubscriptionView",
            });
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  /**
   * Handle team selection confirmation
   */
  const handleTeamSelectionConfirm = (selectedTeamIds: string[]) => {
    setShowTeamSelectionModal(false);
    if (pendingTier) {
      confirmSubscriptionChange(pendingTier, selectedTeamIds);
    }
  };

  /**
   * Handle team selection cancellation
   */
  const handleTeamSelectionCancel = () => {
    setShowTeamSelectionModal(false);
    setPendingTier(null);
    setActiveTeams([]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.subscriptionView}>
        {/* Close button */}
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={textPrimary} />
        </TouchableOpacity>

        {/* Header section */}
        <Text style={[styles.subscriptionTitle, { color: textPrimary }]}>
          {t("subscriptionView.title")}
        </Text>
        <Text style={[styles.subscriptionSubtitle, { color: textSecondary }]}>
          {t("subscriptionView.subtitle")}
        </Text>

        {/* Pricing cards for available subscription tiers */}
        <View style={styles.pricingCards}>
          {plans.map((plan) => (
            <PricingCard
              key={plan.tier}
              tier={plan.tier}
              currentTier={currentTier}
              price={plan.limits.priceMonthly || 0}
              limit={plan.limits.maxTeams}
              name={plan.limits.name}
              colors={colors}
              onSelect={handleUpgrade}
            />
          ))}
        </View>
        </View>
      </ScrollView>

      {/* Team Selection Modal */}
      <TeamSelectionModal
        visible={showTeamSelectionModal}
        teams={activeTeams}
        maxSelection={pendingTier ? (plans.find(p => p.tier === pendingTier)?.limits.maxTeams || 0) : 0}
        tierName={pendingTier || ""}
        requireExactSelection={requireExactSelection}
        onConfirm={handleTeamSelectionConfirm}
        onCancel={handleTeamSelectionCancel}
      />
    </>
  );
}

/** StyleSheet for the subscription view and pricing cards */
const styles = StyleSheet.create({
  /** Main scrollable container */
  container: {
    flex: 1,
  },
  /** Loading container */
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
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
