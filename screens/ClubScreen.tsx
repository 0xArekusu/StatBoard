import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Svg, { Rect, G, Line, Circle, Path, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../src/contexts/ThemeContext';
import { useAuth } from '../src/contexts/AuthContext';
import { SLATE_COLORS, BRAND_COLORS, COMMON_COLORS } from '../src/theme/clubDefaults';
import { ServiceFactory } from '../services/ServiceFactory';
import { supabase } from '../src/config/supabase';
import { Club } from '../models/Club';
import { Team } from '../models/Team';
import Logo from '../components/icons/Logo';

interface ClubScreenProps {
  navigation: any;
}

type TabType = 'create' | 'join';
type SubTabType = 'info' | 'subscription';
type SubscriptionTier = 'FREE' | 'BASIC' | 'PRO' | 'ULTIMATE';

const TIER_LIMITS = {
  FREE: 1,
  BASIC: 3,
  PRO: 10,
  ULTIMATE: 999,
};

const TEAM_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#1e293b', '#000000', '#ffffff',
];

const COURT_COLORS = [
  '#c2410c', '#eab308', '#1e1b4b', '#15803d', '#334155', '#7f1d1d', '#d4d4d4', '#f59e0b',
];

const LINE_COLORS = ['#ffffff', '#000000', '#ef4444', '#3b82f6', '#facc15'];

export default function ClubScreen({ navigation }: ClubScreenProps) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<Club | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('create');
  const [subTab, setSubTab] = useState<SubTabType>('info');

  // Create Club Form
  const [formData, setFormData] = useState({
    name: '',
    acronym: '',
    gender: 'M' as 'M' | 'F' | 'MIXED',
    code: '',
    logoUrl: '',
    primaryColor: '#f97316',
    secondaryColor: '#1e1b4b',
    courtColor: '#c2410c',
    courtLinesColor: '#ffffff',
  });

  // Add Team Logic
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCategory, setNewTeamCategory] = useState('');

  const isGuest = !user;

  useEffect(() => {
    loadClubData();
  }, [user?.id]);

  const loadClubData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const clubService = ServiceFactory.getClubService(supabase);
      const clubs = await clubService.getUserMemberClubs(user.id);
      const firstClub = clubs.length > 0 ? clubs[0] : null;
      setClub(firstClub);

      if (firstClub) {
        const teamService = ServiceFactory.getTeamService(supabase);
        const clubTeams = await teamService.getClubTeams(firstClub.id);
        setTeams(clubTeams);
      }
    } catch (error) {
      console.error('Error loading club data:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentTeamCount = teams.length;
  const currentTier: SubscriptionTier = (club?.subscriptionTier as SubscriptionTier) || 'FREE';
  const maxTeams = TIER_LIMITS[currentTier];
  const isLimitReached = currentTeamCount >= maxTeams;
  const isOwner = club?.ownerId === user?.id;

  const handleAddTeam = async () => {
    if (!club || !newTeamName || !user) return;
    if (isLimitReached) {
      Alert.alert(
        "Limite atteinte",
        `Votre abonnement ${currentTier} est limité à ${maxTeams} équipes. Veuillez mettre à jour votre offre.`
      );
      return;
    }

    try {
      const teamService = ServiceFactory.getTeamService(supabase);
      await teamService.createTeam({
        name: newTeamName,
        category: newTeamCategory || 'Général',
        clubId: club.id,
      });

      // Reload teams
      await loadClubData();

      setIsAddingTeam(false);
      setNewTeamName('');
      setNewTeamCategory('');
    } catch (error) {
      console.error('Error adding team:', error);
      Alert.alert('Erreur', 'Impossible de créer l\'équipe');
    }
  };

  const handleUpgrade = (tier: SubscriptionTier) => {
    if (!club) return;
    Alert.alert(
      'Upgrade',
      `Confirmer le passage à l'offre ${tier} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            // TODO: Implement payment process
            Alert.alert('Succès', 'Abonnement mis à jour avec succès !');
            setSubTab('info');
          }
        }
      ]
    );
  };

  const handleSubmit = async () => {
    if (activeTab === 'create') {
      if (!formData.name || !user) return;

      try {
        const clubService = ServiceFactory.getClubService(supabase);
        const code = (formData.name.substring(0, 3) + Math.floor(Math.random() * 1000)).toUpperCase();

        await clubService.createClub({
          name: formData.name,
          code,
          ownerId: user.id,
          logoUrl: formData.logoUrl || '',
          subscriptionTier: 'FREE',
        });

        await loadClubData();
        Alert.alert('Succès', 'Club créé avec succès !');
      } catch (error) {
        console.error('Error creating club:', error);
        Alert.alert('Erreur', 'Impossible de créer le club');
      }
    } else {
      // Join logic
      if (!formData.code) return;
      Alert.alert('Info', `Tentative de rejoindre le club avec le code: ${formData.code}`);
    }
  };

  const bgColor = isDark ? SLATE_COLORS[950] : SLATE_COLORS[50];
  const surfaceColor = isDark ? SLATE_COLORS[900] : COMMON_COLORS.white;
  const textPrimary = isDark ? COMMON_COLORS.white : SLATE_COLORS[900];
  const textSecondary = isDark ? SLATE_COLORS[400] : SLATE_COLORS[500];
  const borderColor = isDark ? SLATE_COLORS[800] : SLATE_COLORS[200];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={BRAND_COLORS[500]} />
      </View>
    );
  }

  // --- INSIDE A CLUB ---
  if (club) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: textPrimary }]}>Mon Club</Text>
            {isOwner && (
              <TouchableOpacity
                onPress={() => setSubTab(subTab === 'subscription' ? 'info' : 'subscription')}
                style={[
                  styles.headerButton,
                  {
                    backgroundColor: subTab === 'subscription' ? BRAND_COLORS[600] : surfaceColor,
                    borderColor: subTab === 'subscription' ? BRAND_COLORS[500] : borderColor,
                  }
                ]}
              >
                <MaterialCommunityIcons
                  name={currentTier === 'ULTIMATE' ? 'crown' : 'star'}
                  size={12}
                  color={subTab === 'subscription' ? COMMON_COLORS.white : BRAND_COLORS[500]}
                />
                <Text style={[
                  styles.headerButtonText,
                  { color: subTab === 'subscription' ? COMMON_COLORS.white : textSecondary }
                ]}>
                  {subTab === 'subscription' ? 'Fermer' : 'Offre'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* SUBSCRIPTION VIEW */}
          {subTab === 'subscription' ? (
            <View style={styles.subscriptionView}>
              <Text style={[styles.subscriptionTitle, { color: textPrimary }]}>
                Gérez votre offre
              </Text>
              <Text style={[styles.subscriptionSubtitle, { color: textSecondary }]}>
                Passez au niveau supérieur pour ajouter plus d'équipes.
              </Text>

              <View style={styles.pricingCards}>
                <PricingCard tier="FREE" currentTier={currentTier} price="0€" limit={TIER_LIMITS.FREE} isDark={isDark} onSelect={handleUpgrade} />
                <PricingCard tier="BASIC" currentTier={currentTier} price="9.99€" limit={TIER_LIMITS.BASIC} isDark={isDark} onSelect={handleUpgrade} />
                <PricingCard tier="PRO" currentTier={currentTier} price="24.99€" limit={TIER_LIMITS.PRO} isDark={isDark} isPopular onSelect={handleUpgrade} />
                <PricingCard tier="ULTIMATE" currentTier={currentTier} price="49.99€" limit={TIER_LIMITS.ULTIMATE} isDark={isDark} onSelect={handleUpgrade} />
              </View>
            </View>
          ) : (
            <>
              {/* Club Info Card */}
              <View style={[styles.clubCard, { backgroundColor: surfaceColor, borderColor }]}>
                <View style={[styles.clubLogo, {
                  backgroundColor: isDark ? SLATE_COLORS[700] : SLATE_COLORS[100]
                }]}>
                  {club.logoUrl ? (
                    <Text style={{ color: textPrimary }}>IMG</Text>
                  ) : (
                    <Logo width={40} height={40} primaryColor={BRAND_COLORS[500]} secondaryColor={COMMON_COLORS.white} />
                  )}
                </View>

                <Text style={[styles.clubName, { color: textPrimary }]}>{club.name}</Text>

                {isOwner && (
                  <View style={[styles.clubCodeCard, {
                    backgroundColor: isDark ? SLATE_COLORS[900] : SLATE_COLORS[50],
                    borderColor: isDark ? SLATE_COLORS[700] : SLATE_COLORS[100],
                  }]}>
                    <Text style={[styles.clubCodeLabel, { color: textSecondary }]}>CODE CLUB</Text>
                    <View style={styles.clubCodeRow}>
                      <Text style={[styles.clubCodeValue, { color: textPrimary }]}>{club.code}</Text>
                      <TouchableOpacity onPress={() => Alert.alert('Copié', club.code)}>
                        <MaterialCommunityIcons name="content-copy" size={14} color={BRAND_COLORS[500]} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Team Usage Bar */}
                <View style={styles.usageBar}>
                  <View style={styles.usageBarHeader}>
                    <Text style={[styles.usageBarLabel, { color: textSecondary }]}>
                      Abonnement {currentTier}
                    </Text>
                    <Text style={[
                      styles.usageBarValue,
                      { color: isLimitReached ? '#ef4444' : BRAND_COLORS[600] }
                    ]}>
                      {currentTeamCount} / {maxTeams > 100 ? '∞' : maxTeams} Équipes
                    </Text>
                  </View>
                  <View style={[styles.usageBarTrack, {
                    backgroundColor: isDark ? SLATE_COLORS[700] : SLATE_COLORS[100]
                  }]}>
                    <View style={[
                      styles.usageBarFill,
                      {
                        backgroundColor: isLimitReached ? '#ef4444' : BRAND_COLORS[500],
                        width: `${Math.min(100, (currentTeamCount / (maxTeams > 100 ? 20 : maxTeams)) * 100)}%`
                      }
                    ]} />
                  </View>
                  {isLimitReached && isOwner && (
                    <TouchableOpacity onPress={() => setSubTab('subscription')}>
                      <Text style={[styles.upgradeLink, { color: BRAND_COLORS[600] }]}>
                        Augmenter la limite
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Teams Section */}
              <View style={styles.teamsSection}>
                <View style={styles.teamsSectionHeader}>
                  <Text style={[styles.teamsSectionTitle, { color: textPrimary }]}>Nos Équipes</Text>
                  {!isAddingTeam && (
                    <TouchableOpacity
                      onPress={() => {
                        if (isLimitReached) {
                          Alert.alert(
                            'Limite atteinte',
                            `Votre abonnement ${currentTier} est limité à ${maxTeams} équipes. Veuillez mettre à jour votre offre.`
                          );
                        } else {
                          setIsAddingTeam(true);
                        }
                      }}
                      style={[
                        styles.addTeamButton,
                        { backgroundColor: isLimitReached ? SLATE_COLORS[400] : BRAND_COLORS[600] }
                      ]}
                      disabled={!isOwner && isLimitReached}
                    >
                      <MaterialCommunityIcons
                        name={isLimitReached ? 'lock' : 'plus'}
                        size={20}
                        color={COMMON_COLORS.white}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {isAddingTeam && (
                  <View style={[styles.addTeamForm, { backgroundColor: surfaceColor, borderColor }]}>
                    <Text style={[styles.addTeamFormTitle, { color: textPrimary }]}>Nouvelle Équipe</Text>
                    <TextInput
                      placeholder="Nom (ex: Seniors A)"
                      placeholderTextColor={textSecondary}
                      value={newTeamName}
                      onChangeText={setNewTeamName}
                      style={[styles.input, { backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[50], borderColor, color: textPrimary }]}
                    />
                    <TextInput
                      placeholder="Catégorie (ex: Régional 1)"
                      placeholderTextColor={textSecondary}
                      value={newTeamCategory}
                      onChangeText={setNewTeamCategory}
                      style={[styles.input, { backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[50], borderColor, color: textPrimary }]}
                    />
                    <View style={styles.addTeamFormButtons}>
                      <TouchableOpacity onPress={() => setIsAddingTeam(false)} style={styles.cancelButton}>
                        <Text style={[styles.cancelButtonText, { color: textSecondary }]}>Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleAddTeam} style={[styles.createButton, { backgroundColor: BRAND_COLORS[600] }]}>
                        <Text style={styles.createButtonText}>Créer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {teams.length > 0 ? (
                  teams.map((team) => (
                    <TeamCard key={team.id} team={team} isDark={isDark} surfaceColor={surfaceColor} textPrimary={textPrimary} textSecondary={textSecondary} borderColor={borderColor} />
                  ))
                ) : (
                  <View style={[styles.emptyTeams, { backgroundColor: isDark ? `${SLATE_COLORS[900]}80` : SLATE_COLORS[100], borderColor }]}>
                    <MaterialCommunityIcons name="account-group" size={24} color={textSecondary} style={{ opacity: 0.5 }} />
                    <Text style={[styles.emptyTeamsText, { color: textSecondary }]}>Aucune équipe créée.</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    );
  }

  // --- JOIN OR CREATE SCREEN ---
  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: textPrimary }]}>Espace Club</Text>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: isDark ? SLATE_COLORS[900] : SLATE_COLORS[100], borderColor }]}>
          <TouchableOpacity
            onPress={() => setActiveTab('create')}
            style={[
              styles.tab,
              activeTab === 'create' && { backgroundColor: BRAND_COLORS[600] }
            ]}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'create' ? COMMON_COLORS.white : textSecondary }
            ]}>
              Créer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('join')}
            style={[
              styles.tab,
              activeTab === 'join' && { backgroundColor: BRAND_COLORS[600] }
            ]}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'join' ? COMMON_COLORS.white : textSecondary }
            ]}>
              Rejoindre
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'create' ? (
          <View style={styles.formContainer}>
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={[styles.logoPlaceholder, { backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100], borderColor }]}>
                {formData.logoUrl ? (
                  <Text style={{ color: textPrimary }}>IMG</Text>
                ) : (
                  <Logo width={48} height={48} primaryColor={SLATE_COLORS[300]} secondaryColor={SLATE_COLORS[600]} />
                )}
              </View>
              <TextInput
                placeholder="URL du logo (http://...)"
                placeholderTextColor={textSecondary}
                value={formData.logoUrl}
                onChangeText={(value) => setFormData({ ...formData, logoUrl: value })}
                style={[styles.logoInput, { color: textSecondary, borderBottomColor: borderColor }]}
              />
            </View>

            {/* Club Name */}
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: textSecondary }]}>NOM DU CLUB</Text>
              <TextInput
                placeholder="Ex: Los Angeles Lakers"
                placeholderTextColor={textSecondary}
                value={formData.name}
                onChangeText={(value) => setFormData({ ...formData, name: value })}
                style={[styles.formInput, { backgroundColor: surfaceColor, borderColor, color: textPrimary }]}
              />
            </View>

            {/* Acronym & Gender */}
            <View style={styles.formRow}>
              <View style={styles.formCol1}>
                <Text style={[styles.formLabel, { color: textSecondary }]}>SIGLE</Text>
                <TextInput
                  placeholder="LAL"
                  placeholderTextColor={textSecondary}
                  value={formData.acronym}
                  onChangeText={(value) => setFormData({ ...formData, acronym: value.toUpperCase() })}
                  maxLength={4}
                  style={[styles.formInput, styles.acronymInput, { backgroundColor: surfaceColor, borderColor, color: textPrimary }]}
                />
              </View>
              <View style={styles.formCol2}>
                <Text style={[styles.formLabel, { color: textSecondary }]}>TYPE D'ÉQUIPE</Text>
                <View style={[styles.genderButtons, { backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100] }]}>
                  {(['M', 'F', 'MIXED'] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setFormData({ ...formData, gender: g })}
                      style={[
                        styles.genderButton,
                        formData.gender === g && { backgroundColor: surfaceColor }
                      ]}
                    >
                      <Text style={[
                        styles.genderButtonText,
                        { color: formData.gender === g ? BRAND_COLORS[600] : textSecondary }
                      ]}>
                        {g === 'M' ? 'Masc.' : g === 'F' ? 'Fém.' : 'Mixte'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Colors Section */}
            <View style={[styles.formSection, styles.borderTop, { borderTopColor: borderColor }]}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="palette" size={16} color={BRAND_COLORS[500]} />
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Couleurs du Club</Text>
              </View>

              {/* Primary Color */}
              <Text style={[styles.colorLabel, { color: textSecondary }]}>Principale</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
                {TEAM_COLORS.map((c) => (
                  <TouchableOpacity
                    key={`p-${c}`}
                    onPress={() => setFormData({ ...formData, primaryColor: c })}
                    style={[
                      styles.colorButton,
                      { backgroundColor: c },
                      formData.primaryColor === c && styles.colorButtonSelected
                    ]}
                  />
                ))}
              </ScrollView>

              {/* Secondary Color */}
              <Text style={[styles.colorLabel, { color: textSecondary }]}>Secondaire</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
                {TEAM_COLORS.map((c) => (
                  <TouchableOpacity
                    key={`s-${c}`}
                    onPress={() => setFormData({ ...formData, secondaryColor: c })}
                    style={[
                      styles.colorButton,
                      { backgroundColor: c },
                      formData.secondaryColor === c && styles.colorButtonSelected
                    ]}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Court Customization */}
            <View style={[styles.formSection, styles.borderTop, { borderTopColor: borderColor }]}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="basketball-hoop" size={16} color={BRAND_COLORS[500]} />
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Personnalisation Terrain</Text>
              </View>

              <Text style={[styles.colorLabel, { color: textSecondary }]}>Couleur du Parquet</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
                {COURT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={`c-${c}`}
                    onPress={() => setFormData({ ...formData, courtColor: c })}
                    style={[
                      styles.courtColorButton,
                      { backgroundColor: c },
                      formData.courtColor === c && styles.colorButtonSelected
                    ]}
                  />
                ))}
              </ScrollView>

              <Text style={[styles.colorLabel, { color: textSecondary }]}>Couleur des Lignes</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
                {LINE_COLORS.map((c) => (
                  <TouchableOpacity
                    key={`l-${c}`}
                    onPress={() => setFormData({ ...formData, courtLinesColor: c })}
                    style={[
                      styles.colorButton,
                      { backgroundColor: c },
                      formData.courtLinesColor === c && styles.colorButtonSelected
                    ]}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Court Preview */}
            <View style={[styles.courtPreview, { borderColor }]}>
              <CourtPreview
                courtColor={formData.courtColor}
                linesColor={formData.courtLinesColor}
                acronym={formData.acronym}
              />
            </View>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: textSecondary }]}>CODE D'ÉQUIPE</Text>
              <TextInput
                placeholder="Ex: LION69"
                placeholderTextColor={textSecondary}
                value={formData.code}
                onChangeText={(value) => setFormData({ ...formData, code: value.toUpperCase() })}
                style={[styles.formInput, styles.codeInput, { backgroundColor: surfaceColor, borderColor, color: textPrimary }]}
              />
            </View>
            <View style={[styles.infoBox, { backgroundColor: isDark ? `${SLATE_COLORS[800]}80` : SLATE_COLORS[100], borderColor }]}>
              <Text style={[styles.infoText, { color: textSecondary }]}>
                En rejoignant un club existant, vous n'avez pas besoin de payer d'abonnement. C'est le propriétaire du club qui gère les quotas d'équipes.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: borderColor }]}>
        <TouchableOpacity onPress={handleSubmit} style={[styles.submitButton, { backgroundColor: BRAND_COLORS[600] }]}>
          <MaterialCommunityIcons name="check" size={20} color={COMMON_COLORS.white} />
          <Text style={styles.submitButtonText}>
            {activeTab === 'create' ? 'Créer mon club' : 'Rejoindre'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- COMPONENTS ---

interface TeamCardProps {
  team: Team;
  isDark: boolean;
  surfaceColor: string;
  textPrimary: string;
  textSecondary: string;
  borderColor: string;
}

function TeamCard({ team, isDark, surfaceColor, textPrimary, textSecondary, borderColor }: TeamCardProps) {
  return (
    <TouchableOpacity style={[styles.teamCard, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={styles.teamCardLeft}>
        <View style={[styles.teamIcon, { backgroundColor: isDark ? SLATE_COLORS[700] : SLATE_COLORS[100] }]}>
          <MaterialCommunityIcons name="tshirt-crew" size={20} color={BRAND_COLORS[600]} />
        </View>
        <View>
          <Text style={[styles.teamName, { color: textPrimary }]}>{team.name}</Text>
          <Text style={[styles.teamCategory, { color: textSecondary }]}>
            {team.category} • 0 Joueurs
          </Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={textSecondary} />
    </TouchableOpacity>
  );
}

interface PricingCardProps {
  tier: SubscriptionTier;
  currentTier: SubscriptionTier;
  price: string;
  limit: number;
  isDark: boolean;
  isPopular?: boolean;
  onSelect: (tier: SubscriptionTier) => void;
}

function PricingCard({ tier, currentTier, price, limit, isDark, isPopular, onSelect }: PricingCardProps) {
  const isCurrent = tier === currentTier;
  const colors = {
    FREE: '#64748b',
    BASIC: '#3b82f6',
    PRO: '#a855f7',
    ULTIMATE: '#f59e0b',
  };

  return (
    <TouchableOpacity
      onPress={() => onSelect(tier)}
      disabled={isCurrent}
      style={[
        styles.pricingCard,
        {
          backgroundColor: isDark ? SLATE_COLORS[900] : COMMON_COLORS.white,
          borderColor: isCurrent ? BRAND_COLORS[500] : isDark ? SLATE_COLORS[800] : SLATE_COLORS[200],
          borderWidth: isCurrent ? 2 : 1,
          opacity: isCurrent ? 1 : 0.8,
        }
      ]}
    >
      {isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>RECOMMANDÉ</Text>
        </View>
      )}
      <View style={styles.pricingCardContent}>
        <View style={styles.pricingCardLeft}>
          <View style={[styles.pricingIcon, { backgroundColor: colors[tier] }]}>
            <MaterialCommunityIcons
              name={tier === 'ULTIMATE' ? 'crown' : 'star'}
              size={20}
              color={COMMON_COLORS.white}
            />
          </View>
          <View>
            <View style={styles.tierNameRow}>
              <Text style={[styles.tierName, { color: isDark ? COMMON_COLORS.white : SLATE_COLORS[900] }]}>
                {tier}
              </Text>
              {isCurrent && (
                <View style={[styles.currentBadge, { backgroundColor: isDark ? SLATE_COLORS[800] : SLATE_COLORS[100], borderColor: isDark ? SLATE_COLORS[700] : SLATE_COLORS[200] }]}>
                  <Text style={[styles.currentBadgeText, { color: isDark ? SLATE_COLORS[500] : SLATE_COLORS[500] }]}>Actuel</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tierLimit, { color: isDark ? SLATE_COLORS[400] : SLATE_COLORS[500] }]}>
              {limit > 100 ? 'Équipes illimitées' : `Jusqu'à ${limit} équipes`}
            </Text>
          </View>
        </View>
        <View style={styles.pricingCardRight}>
          <Text style={[styles.priceValue, { color: isDark ? COMMON_COLORS.white : SLATE_COLORS[900] }]}>{price}</Text>
          <Text style={[styles.priceLabel, { color: SLATE_COLORS[400] }]}>/ mois</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface CourtPreviewProps {
  courtColor: string;
  linesColor: string;
  acronym: string;
}

function CourtPreview({ courtColor, linesColor, acronym }: CourtPreviewProps) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 50">
      {/* Floor Base */}
      <Rect x="0" y="0" width="100" height="50" fill={courtColor} />

      {/* Gradient Overlay */}
      <Defs>
        <LinearGradient id="woodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#000" stopOpacity="0" />
          <Stop offset="100%" stopColor="#000" stopOpacity="0.2" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="50" fill="url(#woodGradient)" opacity="0.1" />

      {/* Lines */}
      <G fill="none" stroke={linesColor} strokeWidth="0.8">
        <Line x1="50" y1="0" x2="50" y2="50" />
        <Circle cx="50" cy="25" r="6" />

        <Path d="M 0 17 L 16 17 L 16 33 L 0 33" />
        <Path d="M 16 17 A 6 6 0 0 1 16 33" />
        <Path d="M 0 4 L 4 4 Q 28 25 4 46 L 0 46" />

        <Path d="M 100 17 L 84 17 L 84 33 L 100 33" />
        <Path d="M 84 17 A 6 6 0 0 0 84 33" />
        <Path d="M 100 4 L 96 4 Q 72 25 96 46 L 100 46" />
      </G>

      {/* Branding */}
      <SvgText
        x="50"
        y="27"
        textAnchor="middle"
        fill={linesColor}
        fontSize="4"
        fontWeight="bold"
        opacity="0.5"
      >
        {acronym || 'TEAM'}
      </SvgText>
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 40,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  subscriptionView: {
    gap: 24,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subscriptionSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: -16,
  },
  pricingCards: {
    gap: 16,
  },
  clubCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 24,
  },
  clubLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  clubName: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 16,
  },
  clubCodeCard: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  clubCodeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  clubCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clubCodeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  usageBar: {
    width: '100%',
  },
  usageBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  usageBarLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  usageBarValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  usageBarTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  upgradeLink: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  teamsSection: {
    gap: 16,
  },
  teamsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addTeamButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTeamForm: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  addTeamFormTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    fontSize: 14,
  },
  addTeamFormButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  createButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COMMON_COLORS.white,
  },
  emptyTeams: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyTeamsText: {
    fontSize: 14,
    marginTop: 8,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  teamCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  teamIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  teamCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  formContainer: {
    gap: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoInput: {
    marginTop: 12,
    fontSize: 12,
    textAlign: 'center',
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  formSection: {
    gap: 8,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  formInput: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: 'bold',
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formCol1: {
    flex: 1,
    gap: 8,
  },
  formCol2: {
    flex: 2,
    gap: 8,
  },
  acronymInput: {
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  genderButtons: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    height: 58,
  },
  genderButton: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  borderTop: {
    paddingTop: 24,
    borderTopWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: SLATE_COLORS[900],
    transform: [{ scale: 1.1 }],
  },
  courtColorButton: {
    width: 64,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  courtPreview: {
    width: '100%',
    aspectRatio: 2,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  codeInput: {
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 4,
    fontSize: 18,
    fontFamily: 'monospace',
  },
  infoBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COMMON_COLORS.white,
  },
  pricingCard: {
    padding: 16,
    borderRadius: 16,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -50 }],
    backgroundColor: BRAND_COLORS[600],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  popularBadgeText: {
    color: COMMON_COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  pricingCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pricingCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pricingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  currentBadgeText: {
    fontSize: 10,
  },
  tierLimit: {
    fontSize: 12,
    marginTop: 2,
  },
  pricingCardRight: {
    alignItems: 'flex-end',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  priceLabel: {
    fontSize: 10,
  },
});
