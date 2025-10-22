# Architecture - Club Management

Cette architecture suit les principes **SOLID** et utilise plusieurs **Design Patterns GOF** pour assurer la maintenabilité et la testabilité du code.

## 📁 Structure des fichiers

```
StatBoard/
├── models/
│   └── Club.ts                    # Domain models & DTOs
├── repositories/
│   ├── IClubRepository.ts         # Repository interface
│   └── SupabaseClubRepository.ts  # Supabase implementation
├── services/
│   ├── ClubService.ts             # Business logic
│   └── ServiceFactory.ts          # Factory + Singleton
├── screens/
│   └── CreateClubScreen.tsx       # UI Layer
└── supabase/
    └── migrations/
        └── create_clubs_table.sql # Database schema
```

## 🎯 Design Patterns utilisés

### 1. **Repository Pattern** 📦
- **Fichiers**: `IClubRepository.ts`, `SupabaseClubRepository.ts`
- **Objectif**: Abstraction de la couche d'accès aux données
- **Avantages**:
  - Séparation des préoccupations
  - Facilite le changement de base de données
  - Testabilité (mock facile)

```typescript
interface IClubRepository {
  create(data: CreateClubData): Promise<Club | null>;
  findById(id: string): Promise<Club | null>;
  // ...
}
```

### 2. **Service Layer Pattern** 🔧
- **Fichier**: `ClubService.ts`
- **Objectif**: Centralisation de la logique métier
- **Avantages**:
  - Validation centralisée
  - Réutilisabilité
  - Séparation UI / Business Logic

```typescript
class ClubService {
  constructor(private clubRepository: IClubRepository) {}

  async createClub(data: CreateClubData): Promise<Result> {
    // Validation + Business rules
  }
}
```

### 3. **Factory Pattern** 🏭
- **Fichier**: `ServiceFactory.ts`
- **Objectif**: Création centralisée des services
- **Avantages**:
  - Injection de dépendances
  - Configuration centralisée
  - Facilite les tests

```typescript
class ServiceFactory {
  static getClubService(supabase: SupabaseClient): ClubService {
    const repo = new SupabaseClubRepository(supabase);
    return new ClubService(repo);
  }
}
```

### 4. **Singleton Pattern** 🔒
- **Fichier**: `ServiceFactory.ts`
- **Objectif**: Une seule instance de service
- **Avantages**:
  - Performance (réutilisation)
  - État partagé cohérent

```typescript
private static clubServiceInstance: ClubService | null = null;
```

### 5. **Data Transfer Object (DTO)** 📤
- **Fichier**: `Club.ts`
- **Objectif**: Séparation des modèles de domaine et des données de transfert
- **Avantages**:
  - Validation claire
  - Typage fort
  - Sécurité

```typescript
interface CreateClubData {
  name: string;
  acronym: string;
  // ... (sans id, createdAt, etc.)
}
```

## 🔄 Flux de données

```
UI (CreateClubScreen)
    ↓
ServiceFactory.getClubService()
    ↓
ClubService.createClub()
    ↓ (validation)
SupabaseClubRepository.create()
    ↓
Supabase Database
    ↓
Club model (mapped)
    ↓
UI (success/error)
```

## 📊 Schéma de la base de données

### Table: `clubs`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Clé primaire |
| `name` | VARCHAR(30) | Nom du club |
| `acronym` | VARCHAR(5) | Sigle du club |
| `code` | VARCHAR(6) | Code unique de 6 chiffres |
| `logo_url` | TEXT | URL du logo (optionnel) |
| `primary_color` | VARCHAR(7) | Couleur principale (#RRGGBB) |
| `secondary_color` | VARCHAR(7) | Couleur secondaire (#RRGGBB) |
| `court_background_color` | VARCHAR(7) | Couleur fond terrain |
| `court_line_color` | VARCHAR(7) | Couleur lignes terrain |
| `owner_id` | UUID | FK vers auth.users |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Dernière modification |

### Index
- `idx_clubs_code` sur `code` (recherche rapide)
- `idx_clubs_owner` sur `owner_id` (clubs par utilisateur)

### Policies RLS (Row Level Security)
- Lecture: Tous
- Création: Propriétaire uniquement
- Modification: Propriétaire uniquement
- Suppression: Propriétaire uniquement

## 🧪 Avantages de cette architecture

### ✅ Testabilité
```typescript
// Mock facile grâce à l'interface
const mockRepo: IClubRepository = {
  create: jest.fn(),
  // ...
};
const service = new ClubService(mockRepo);
```

### ✅ Maintenabilité
- Chaque fichier a une responsabilité unique (SRP)
- Facile à modifier sans impacter le reste

### ✅ Extensibilité
- Ajouter un nouveau repository (ex: Firebase) sans toucher au service
- Ajouter de nouvelles règles métier dans le service

### ✅ Découplage
- L'UI ne connaît pas Supabase
- Le Service ne connaît pas l'implémentation du Repository
- Changement facile de technologie

## 🚀 Utilisation

### Créer un club
```typescript
const clubService = ServiceFactory.getClubService(supabase);
const result = await clubService.createClub({
  name: "Lakers",
  acronym: "LAL",
  primaryColor: "#552583",
  secondaryColor: "#FDB927",
  courtBackgroundColor: "#1a472a",
  courtLineColor: "#FFFFFF",
});

if (result.success) {
  console.log("Code:", result.club.code);
}
```

### Récupérer les clubs d'un utilisateur
```typescript
const clubs = await clubService.getUserClubs(userId);
```

## 📝 Migration Supabase

Exécuter le script SQL sur Supabase :
```sql
-- Copier le contenu de supabase/migrations/create_clubs_table.sql
-- et l'exécuter dans le SQL Editor de Supabase
```

## 🔐 Principes SOLID appliqués

1. **S** - Single Responsibility: Chaque classe a une seule raison de changer
2. **O** - Open/Closed: Ouvert à l'extension, fermé à la modification
3. **L** - Liskov Substitution: Les implémentations respectent les interfaces
4. **I** - Interface Segregation: Interfaces spécifiques et ciblées
5. **D** - Dependency Inversion: Dépendance sur les abstractions, pas les implémentations
