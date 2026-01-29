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
import { useTheme } from "../../src/contexts/ThemeContext";
import { SLATE_COLORS, BRAND_COLORS, COMMON_COLORS } from "../../src/theme";
import { Club } from "../../models/Club";
import { SubscriptionTier, SubscriptionLimits } from "../../models/Subscription";
import { Team } from "../../models/Team";
import { ServiceFactory } from "../../services/ServiceFactory";
import { supabase } from "../../src/config/supabase";
import TeamSelectionModal from "./TeamSelectionModal";

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
                {name || tier}
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
            {price > 0 ? `${price.toFixed(2)}€` : 'Gratuit'}
          </Text>
          {price > 0 && (
            <Text style={[styles.priceLabel, { color: colors.text.tertiary }]}>
              / mois
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
  // Get theme context for dark/light mode support
  const { colors } = useTheme();

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
      Alert.alert("Erreur", "Offre introuvable");
      return;
    }

    const newMaxTeams = targetPlan.limits.maxTeams;

    // Check if this is a downgrade that requires team selection
    try {
      const teamService = ServiceFactory.getTeamService(supabase);
      const activeTeamCount = await teamService.getActiveTeamsCount(club.id);

      if (activeTeamCount > newMaxTeams) {
        // Need to select teams to keep
        const teams = await teamService.getClubTeamsByStatus(club.id, "approved");
        const activeTeamsList = teams.filter(t => t.isActive && !t.isDeleted);

        setPendingTier(tier);
        setActiveTeams(activeTeamsList);
        setShowTeamSelectionModal(true);
      } else {
        // No team selection needed, proceed directly
        confirmSubscriptionChange(tier);
      }
    } catch (error) {
      console.error("Error checking team count:", error);
      Alert.alert("Erreur", "Impossible de vérifier le nombre d'équipes");
    }
  };

  /**
   * Confirm subscription change after team selection (if needed)
   */
  const confirmSubscriptionChange = (tier: SubscriptionTier, selectedTeamIds?: string[]) => {
    Alert.alert("Changement d'offre", `Confirmer le passage à l'offre ${tier} ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Confirmer",
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
              let message = "Abonnement mis à jour avec succès !";

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
                    message += `\n\n${limitResult.reactivatedCount} équipe(s) réactivée(s).`;
                  }
                  if (limitResult.suspendedCount && limitResult.suspendedCount > 0) {
                    message += `\n\n${limitResult.suspendedCount} équipe(s) suspendue(s).`;
                  }
                }
              }

              // Notify parent component to refresh club data
              if (onSubscriptionUpdated) {
                onSubscriptionUpdated(result.club);
              }

              Alert.alert("Succès", message);
              onClose();
            } else {
              Alert.alert("Erreur", result.error || "Échec de la mise à jour de l'abonnement");
            }
          } catch (error) {
            console.error("Error updating subscription:", error);
            Alert.alert("Erreur", "Une erreur est survenue lors de la mise à jour");
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
          Gérez votre offre
        </Text>
        <Text style={[styles.subscriptionSubtitle, { color: textSecondary }]}>
          Passez au niveau supérieur pour ajouter plus d'équipes.
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
