# Repositories - Data Access Layer

Ce dossier contient la **couche d'accès aux données** de l'application. Les repositories abstraient l'accès à Supabase via le **Repository Pattern**.

## 🏗️ Architecture

```
Service Layer
    ↓
Repository Interface (I*Repository)
    ↓
Repository Implementation (Supabase*Repository)
    ↓
Supabase Database
```

## 📋 Principe du Repository Pattern

Le **Repository Pattern** sépare la logique métier (services) de la logique d'accès aux données (repositories).

### Avantages
✅ **Abstraction** : Le service ne connaît pas Supabase, seulement l'interface
✅ **Testabilité** : Facile de mocker les repositories pour les tests
✅ **Maintenabilité** : Changement de BDD possible sans toucher aux services
✅ **Typage fort** : Interfaces TypeScript garantissent le contrat

### Convention
- **Interface** : `I*Repository.ts` (ex: `IClubRepository.ts`)
- **Implémentation Supabase** : `Supabase*Repository.ts` (ex: `SupabaseClubRepository.ts`)
- **Future implémentation** : `Firebase*Repository.ts`, `Prisma*Repository.ts`, etc.

---

## 📂 Liste des repositories

### 🏀 **IClubRepository** / **SupabaseClubRepository**

Gestion des clubs sportifs.

**Interface** : [IClubRepository.ts](./IClubRepository.ts)
**Implémentation** : [SupabaseClubRepository.ts](./SupabaseClubRepository.ts)

**Méthodes** :
```typescript
create(data: CreateClubData): Promise<Club | null>
findById(id: string): Promise<Club | null>
findByCode(code: string): Promise<Club | null>
findByOwnerId(userId: string): Promise<Club[]>
findByMemberId(userId: string): Promise<Club[]>
update(id: string, data: UpdateClubData): Promise<Club | null>
delete(id: string): Promise<boolean>
```

**Table Supabase** : `clubs`

**Exemple** :
```typescript
const clubRepo = new SupabaseClubRepository(supabase);
const club = await clubRepo.findByCode("123456");
```

---

### 👥 **ITeamRepository** / **SupabaseTeamRepository**

Gestion des équipes au sein d'un club.

**Interface** : [ITeamRepository.ts](./ITeamRepository.ts)
**Implémentation** : [SupabaseTeamRepository.ts](./SupabaseTeamRepository.ts)

**Méthodes** :
```typescript
create(data: CreateTeamData, ownerId: string): Promise<Team | null>
findById(id: string): Promise<Team | null>
findByClubId(clubId: string): Promise<Team[]>
findByClubIdAndStatus(clubId: string, status: TeamStatus): Promise<Team[]>
findByOwnerId(ownerId: string): Promise<Team[]>
update(id: string, data: UpdateTeamData): Promise<Team | null>
delete(id: string): Promise<boolean>
countByOwnerAndClub(ownerId: string, clubId: string): Promise<number>
```

**Table Supabase** : `teams`

**Particularités** :
- Vérifie les permissions (owner/admin)
- Compte le nombre d'équipes pour limites subscription
- Gestion du statut (ACTIVE, ARCHIVED)

---

### 🏃 **IPlayerRepository** / **SupabasePlayerRepository**

Gestion des joueurs d'une équipe.

**Interface** : [IPlayerRepository.ts](./IPlayerRepository.ts)
**Implémentation** : [SupabasePlayerRepository.ts](./SupabasePlayerRepository.ts)

**Méthodes** :
```typescript
create(data: CreatePlayerData): Promise<Player | null>
findById(id: string): Promise<Player | null>
findByTeamId(teamId: string): Promise<Player[]>
update(id: string, data: UpdatePlayerData): Promise<Player | null>
delete(id: string): Promise<boolean>
```

**Table Supabase** : `players`

**Champs** :
- `first_name`, `last_name`, `number`
- `team_id` (FK vers teams)
- `photo_url` (optionnel)

---

### 🤝 **IClubMemberRepository** / **SupabaseClubMemberRepository**

Gestion des membres d'un club.

**Interface** : [IClubMemberRepository.ts](./IClubMemberRepository.ts)
**Implémentation** : [SupabaseClubMemberRepository.ts](./SupabaseClubMemberRepository.ts)

**Méthodes** :
```typescript
create(data: CreateClubMemberData): Promise<ClubMember | null>
findByClubId(clubId: string): Promise<ClubMember[]>
findByUserId(userId: string): Promise<ClubMember[]>
findByClubAndUser(clubId: string, userId: string): Promise<ClubMember | null>
updateRole(id: string, role: MemberRole): Promise<ClubMember | null>
delete(id: string): Promise<boolean>
```

**Table Supabase** : `club_members`

**Rôles** :
- `OWNER` : Propriétaire du club
- `ADMIN` : Administrateur
- `MEMBER` : Membre standard

---

## 📝 Conventions d'implémentation

### Structure d'un repository

```typescript
import { SupabaseClient } from "@supabase/supabase-js";
import { IXxxRepository } from "./IXxxRepository";
import { Xxx, CreateXxxData, UpdateXxxData } from "../models/Xxx";

export class SupabaseXxxRepository implements IXxxRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(data: CreateXxxData): Promise<Xxx | null> {
    try {
      const { data: result, error } = await this.supabase
        .from("xxx_table")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error("Error creating xxx:", error);
      return null;
    }
  }

  async findById(id: string): Promise<Xxx | null> {
    try {
      const { data, error } = await this.supabase
        .from("xxx_table")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error finding xxx:", error);
      return null;
    }
  }

  // Autres méthodes...
}
```

### Gestion des erreurs

Les repositories **ne lancent pas d'erreurs** vers le service. Ils retournent :
- `null` en cas d'échec pour un objet unique
- `[]` (tableau vide) en cas d'échec pour une liste
- `false` en cas d'échec pour une opération booléenne

**Raison** : Le service gère la logique métier et décide comment réagir à l'échec.

```typescript
// ✅ BON
async findById(id: string): Promise<Club | null> {
  try {
    const { data, error } = await this.supabase...
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error:", error);
    return null; // ← Retourne null
  }
}

// ❌ MAUVAIS
async findById(id: string): Promise<Club> {
  const { data, error } = await this.supabase...
  if (error) throw error; // ← Ne pas propager l'erreur
  return data;
}
```

### Requêtes Supabase

**Sélection simple** :
```typescript
const { data, error } = await this.supabase
  .from("teams")
  .select("*")
  .eq("club_id", clubId);
```

**Avec jointure** :
```typescript
const { data, error } = await this.supabase
  .from("teams")
  .select(`
    *,
    club:clubs(*)
  `)
  .eq("id", teamId)
  .single();
```

**Avec filtres multiples** :
```typescript
const { data, error } = await this.supabase
  .from("teams")
  .select("*")
  .eq("club_id", clubId)
  .eq("status", "ACTIVE")
  .order("name", { ascending: true });
```

---

## 🔄 Flow de données

### Création d'une entité

```
1. UI envoie données au Service
    ↓
2. Service valide les données
    ↓
3. Service appelle repository.create(data)
    ↓
4. Repository exécute INSERT Supabase
    ↓
5. Repository retourne l'entité créée (ou null)
    ↓
6. Service retourne { success, data/error }
    ↓
7. UI affiche le résultat
```

### Récupération d'entités

```
1. UI demande des données au Service
    ↓
2. Service appelle repository.findByXxx(id)
    ↓
3. Repository exécute SELECT Supabase
    ↓
4. Repository retourne les entités (ou [])
    ↓
5. Service applique logique métier (tri, filtrage)
    ↓
6. Service retourne { success, data }
    ↓
7. UI affiche les données
```

---

## 🧪 Testing (à venir)

Les repositories peuvent être mockés pour tester les services :

```typescript
// Mock du repository
const mockClubRepo: IClubRepository = {
  create: jest.fn().mockResolvedValue(mockClub),
  findById: jest.fn().mockResolvedValue(mockClub),
  findByCode: jest.fn().mockResolvedValue(null),
  findByOwnerId: jest.fn().mockResolvedValue([mockClub]),
  findByMemberId: jest.fn().mockResolvedValue([]),
  update: jest.fn().mockResolvedValue(mockClub),
  delete: jest.fn().mockResolvedValue(true),
};

// Test du service avec mock
const clubService = new ClubService(mockClubRepo);
const result = await clubService.createClub(data);

expect(mockClubRepo.create).toHaveBeenCalledWith(data);
expect(result.success).toBe(true);
```

---

## 🚀 Ajouter un nouveau repository

### 1. Créer l'interface

**Fichier** : `IXxxRepository.ts`

```typescript
import { Xxx, CreateXxxData, UpdateXxxData } from "../models/Xxx";

export interface IXxxRepository {
  create(data: CreateXxxData): Promise<Xxx | null>;
  findById(id: string): Promise<Xxx | null>;
  findAll(): Promise<Xxx[]>;
  update(id: string, data: UpdateXxxData): Promise<Xxx | null>;
  delete(id: string): Promise<boolean>;
}
```

### 2. Créer l'implémentation Supabase

**Fichier** : `SupabaseXxxRepository.ts`

```typescript
import { SupabaseClient } from "@supabase/supabase-js";
import { IXxxRepository } from "./IXxxRepository";
import { Xxx, CreateXxxData, UpdateXxxData } from "../models/Xxx";

export class SupabaseXxxRepository implements IXxxRepository {
  constructor(private supabase: SupabaseClient) {}

  async create(data: CreateXxxData): Promise<Xxx | null> {
    // Implémentation...
  }

  // Autres méthodes...
}
```

### 3. Créer le modèle

**Fichier** : `models/Xxx.ts`

```typescript
export interface Xxx {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateXxxData {
  name: string;
}

export interface UpdateXxxData {
  name?: string;
}
```

### 4. Ajouter au ServiceFactory

Voir [services/README.md](../services/README.md#ajouter-un-nouveau-service)

---

## 📚 Tables Supabase

### Schéma actuel

```
clubs
  ├── id (uuid, PK)
  ├── name (varchar)
  ├── code (varchar, UNIQUE)
  ├── owner_id (uuid, FK → auth.users)
  └── ...

teams
  ├── id (uuid, PK)
  ├── name (varchar)
  ├── club_id (uuid, FK → clubs)
  ├── owner_id (uuid, FK → auth.users)
  └── ...

players
  ├── id (uuid, PK)
  ├── first_name (varchar)
  ├── last_name (varchar)
  ├── number (int)
  ├── team_id (uuid, FK → teams)
  └── ...

club_members
  ├── id (uuid, PK)
  ├── club_id (uuid, FK → clubs)
  ├── user_id (uuid, FK → auth.users)
  ├── role (enum: OWNER, ADMIN, MEMBER)
  └── ...
```

**Doc complète** : [SQLITE_DATABASE_STRUCTURE.md](../SQLITE_DATABASE_STRUCTURE.md)

---

## 🔐 Row Level Security (RLS)

Les repositories respectent les **RLS Policies** de Supabase :

- **Lecture** : Tout membre du club peut lire
- **Création** : Seul le propriétaire peut créer
- **Modification** : Seul le propriétaire/admin peut modifier
- **Suppression** : Seul le propriétaire peut supprimer

Les repositories **ne gèrent pas les permissions** (c'est le rôle du service).

---

## 📖 Voir aussi

- [services/README.md](../services/README.md) - Couche métier (utilise les repositories)
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Principes SOLID et Design Patterns
- [models/](../models/) - Modèles de données (DTOs)
- [SQLITE_DATABASE_STRUCTURE.md](../SQLITE_DATABASE_STRUCTURE.md) - Schéma de la BDD
