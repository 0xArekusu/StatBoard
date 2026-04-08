---
name: ui-audit
description: Audite un fichier UI pour violations de thème (isDark, couleurs hardcodées, tailles hardcodées) et composants à extraire
argument-hint: <chemin/du/fichier>
---

# Audit UI — $ARGUMENTS

Analyse le fichier `$ARGUMENTS` (ou les fichiers du dossier si c'est un dossier) et produis un rapport structuré.

## Ce que tu dois vérifier

### 1. Violations de thème

Cherche et liste chaque occurrence de :

- `isDark` utilisé pour calculer une couleur (ex: `isDark ? "#fff" : "#000"`)
- Couleurs hexadécimales hardcodées (ex: `"#FF5733"`, `"#1a1a1a"`)
- `rgba(` ou `rgb(` hardcodés
- Chaînes de couleur CSS directes dans les styles (`"red"`, `"white"`, `"black"` — sauf via `COMMON_COLORS`)

Pour chaque violation, indique :
- Numéro de ligne
- Le code exact
- Le remplacement correct avec `colors.*` ou `STATUS_COLORS.*`

### 2. Violations de tailles hardcodées

Cherche et liste chaque occurrence de :

- Valeurs numériques hardcodées dans les styles pour `padding`, `margin`, `fontSize`, `width`, `height`, `gap`, `borderRadius` (ex: `padding: 16`, `fontSize: 14`)
- Tailles d'avatars, icônes, logos hardcodées

Pour chaque violation, indique :
- Numéro de ligne
- Le code exact
- Le token `useResponsive` correct (`sp.md`, `font.lg`, `sizes.avatarMd`, etc.)

Tokens de référence :
- Espacement : `sp.xs/sm/md/lg/xl/xxl` (2-4 / 4-8 / 8-16 / 12-24 / 16-32 / 24-40)
- Police : `font.xs/sm/md/lg/xl/xxl/xxxl` (9-10 / 10-12 / 11-14 / 13-16 / 15-18 / 18-24 / 24-36)
- Avatars : `sizes.avatarSm/Md/Lg` (24-40 / 40-72 / 56-96)
- Icônes : `sizes.iconSm/Md` (14-20 / 18-24)

### 3. Taille et découpage

- Compte le nombre de lignes total du fichier
- Identifie les blocs JSX qui mériteraient d'être extraits en composant séparé :
  - Sections logiquement distinctes (header, liste, carte, footer, modal)
  - Render helpers `renderXxx` de plus de 20 lignes
  - Blocs répétés
- Pour chaque extraction suggérée, propose :
  - Nom du composant (PascalCase)
  - Chemin de fichier suggéré (`components/<Feature>/NomComposant.tsx`)
  - Props nécessaires

### 3. Autres violations courantes

- Magic strings ou magic numbers dans les styles (utiliser des constantes)
- Imports désordonnés (ordre : React/RN → libs → contexts → services → models → components → utils → constants)
- `any` TypeScript

## Format de réponse

Retourne un rapport markdown avec ces sections :

```
## Résumé
- Fichier : <chemin>
- Lignes : <n>
- Violations thème : <n>
- Composants à extraire : <n>

## Violations de Thème
| Ligne | Code actuel | Correction |
|-------|------------|------------|
| 42 | `isDark ? "#fff" : "#000"` | `colors.text.primary` |

## Composants à Extraire
### 1. <NomComposant>
- Fichier : `components/Feature/NomComposant.tsx`
- Lignes concernées : 80-140
- Props : `{ title: string, onPress: () => void }`

## Autres Points
- ...
```

Si le fichier respecte toutes les règles, dis-le clairement.
