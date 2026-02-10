-- ====================================
-- Script de nettoyage des matchs
-- ATTENTION : Ce script supprime TOUTES les données de matchs
-- ====================================

-- Supprimer tous les matchs (players sont dans JSON, pas de cascade nécessaire)
DELETE FROM matches;

-- Vérifier que tout est bien supprimé
SELECT 'Matches restants:' as info, COUNT(*) as count FROM matches;

-- ====================================
-- Script de nettoyage sélectif (optionnel)
-- ====================================

-- Option A : Supprimer uniquement les matchs d'un utilisateur spécifique
-- DELETE FROM matches WHERE created_by = 'UUID_DE_L_UTILISATEUR';

-- Option B : Supprimer uniquement les matchs d'un club spécifique
-- DELETE FROM matches WHERE club_id = 'UUID_DU_CLUB';

-- Option C : Supprimer les matchs après une certaine date
-- DELETE FROM matches WHERE created_at > '2025-01-01';

-- Option D : Supprimer un match spécifique
-- DELETE FROM matches WHERE id = 'UUID_DU_MATCH';
