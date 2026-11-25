-- Approbation automatique des equipes
-- Date : 2026-11-24
--
-- Contexte : la validation par le proprietaire du club n'etait jamais faite.
-- Au 24/11/2026, 8 equipes etaient bloquees en `pending`, dont 4 creees par le
-- proprietaire du club lui-meme, la plus ancienne depuis le 25/04/2026. Aucune
-- n'avait de match : une equipe non approuvee ne peut pas etre ouverte depuis
-- l'ecran club, n'apparait pas dans le dashboard et ne peut pas servir a lancer
-- un match.
--
-- A partir de la version qui suit, l'app envoie `status: 'approved'` a la
-- creation (repositories/SupabaseTeamRepository.ts), donc le DEFAULT de la
-- colonne n'est plus determinant pour les creations faites depuis l'app.
-- Ce script ne traite que les donnees existantes.
--
-- A executer dans Supabase -> SQL Editor. Reversible en connaissant les ids.

BEGIN;

-- 1. Combien d'equipes sont concernees (attendu : 8 au 24/11/2026)
SELECT count(*) AS equipes_a_debloquer
FROM teams
WHERE status = 'pending' AND is_deleted = false;

-- 2. Deblocage
UPDATE teams
SET status = 'approved',
    updated_at = now()
WHERE status = 'pending'
  AND is_deleted = false;

-- 3. Verification : il ne doit plus rester aucune equipe en attente
SELECT status, count(*)
FROM teams
WHERE is_deleted = false
GROUP BY status
ORDER BY status;

COMMIT;
