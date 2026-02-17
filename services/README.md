# Services Layer - Business Logic

Ce dossier contient la **couche métier** de l'application. Les services encapsulent la logique business et orchestrent les interactions avec les repositories.

## 🏗️ Architecture

```
UI Layer (screens/components)
    ↓
ServiceFactory
    ↓
Service Layer (ce dossier)
    ↓
Repository Layer (repositories/)
    ↓
Data Sources (Supabase, SQLite)
```

## 📋 Liste des services

### 🏀 Gestion d'équipes et clubs

#### **ClubService**
Gestion des clubs sportifs.
- Création/modification/suppression de clubs
- Validation des données (nom, acronyme, couleurs)
- Gestion du code unique du club
- Upload du logo

**Usage** :
```typescript
const clubService = ServiceFactory.getClubService(supabase);
const result = await clubService.createClub({
  name: "Lakers",
  acronym: "LAL",
  primaryColor: "#552583",
  secondaryColor: "#FDB927"
});
```

#### **TeamService**
Gestion des équipes au sein d'un club.
- CRUD équipes
- Vérification limites subscription (nombre d'équipes)
- Gestion des permissions (owner/admin)
- Catégories (U11, U13, Seniors...)

**Dépendances** :
- `ITeamRepository`
- `IClubMemberRepository` (pour permissions)
- `SubscriptionService` (pour limites)

#### **ClubMemberService**
Gestion des membres d'un club.
- Invitation de membres
- Gestion des rôles (owner, admin, member)
- Validation du code d'accès club

#### **PlayerService**
Gestion des joueurs d'une équipe.
- CRUD joueurs
- Numéros de maillot
- Informations joueur (nom, prénom, position)

### 📊 Gestion des matchs

#### **MatchDataService**
Service pour gérer les données d'un match (actions, score, stats).
- CRUD actions de match (tir, rebond, faute...)
- Calcul du score en temps réel
- Statistiques par joueur
- Sauvegarde locale (SQLite via ActionRepository)

**Dépendances** :
- `ActionRepository` (SQLite local)
- Supabase (sync cloud)

#### **MatchListService**
Service pour lister et filtrer les matchs.
- Liste des matchs d'une équipe
- Filtrage (date, adversaire, résultat)
- Tri et pagination
- Accès SQLite via `MatchRepository`

#### **MatchSyncService**
Service de synchronisation match local ↔ cloud.
- Upload des matchs locaux vers Supabase
- Download des matchs cloud vers SQLite
- Gestion des conflits
- Mode offline

📖 **Doc complète** : [MATCH_SYNC_USAGE.md](../MATCH_SYNC_USAGE.md)

### 🔧 Services utilitaires

#### **SubscriptionService**
Gestion des abonnements et limites.
- Vérifier les limites (nb équipes, nb joueurs, features premium)
- Informations sur le plan actuel (FREE, PRO, CLUB)
- Upgrade/downgrade

**Constantes** :
```typescript
SUBSCRIPTION_LIMITS = {
  FREE: { maxTeams: 1, maxPlayersPerTeam: 15 },
  PRO: { maxTeams: 5, maxPlayersPerTeam: 30 },
  CLUB: { maxTeams: Infinity, maxPlayersPerTeam: 50 }
}
```

#### **PhotoUploadService**
Service d'upload de photos (logos, avatars).
- Compression des images
- Upload vers Supabase Storage
- Génération d'URL publiques
- Gestion des erreurs

#### **LoggerService**
Service de logging centralisé.
- Logs en développement
- Erreurs tracking
- Performance monitoring

#### **AdminService**
Vérification du statut admin de l'utilisateur courant.
- Singleton avec cache en mémoire
- Invalidation automatique du cache au changement d'utilisateur
- Accès direct (sans ServiceFactory — pas de repository, pas de dépendances)

**Usage** :
```typescript
const adminService = AdminService.getInstance();
const isAdmin = await adminService.isAdmin(); // DB query la 1ère fois, cache ensuite
await adminService.refreshAdminStatus();       // Forcer un refresh
adminService.getCachedStatus();                // boolean | null sans requête
```

**Setup** :
1. Exécuter `supabase/scripts/08_create_admins_table.sql` sur Supabase
2. Ajouter un admin via SQL Editor :
```sql
INSERT INTO admins (user_id) VALUES ('user-guid-here');
-- Trouver le guid : SELECT id, email FROM auth.users;
```

## 🏭 ServiceFactory (Design Pattern)

Le **ServiceFactory** centralise la création des services et implémente le **Singleton Pattern**.

### Principes
1. **Injection de dépendances** : Le factory injecte les repositories dans les services
2. **Singleton** : Une seule instance par service (performance + cohérence)
3. **Point d'entrée unique** : Toute l'app utilise le factory

### Méthodes disponibles

```typescript
ServiceFactory.getClubService(supabase)
ServiceFactory.getTeamService(supabase)
ServiceFactory.getPlayerService(supabase)
ServiceFactory.getClubMemberService(supabase)
ServiceFactory.getSubscriptionService(supabase)
ServiceFactory.getMatchDataService(supabase)
ServiceFactory.getMatchListService(supabase)
ServiceFactory.getMatchSyncService(supabase)
ServiceFactory.reset() // Pour les tests
```

### Exemple d'utilisation

```typescript
import { ServiceFactory } from "../services/ServiceFactory";
import { supabase } from "../src/config/supabase";

// Dans un composant/screen
const teamService = ServiceFactory.getTeamService(supabase);
const teams = await teamService.getTeamsByClub(clubId);
```

## 📝 Conventions

### Structure d'un service

```typescript
export class XxxService {
  constructor(
    private xxxRepository: IXxxRepository,
    // autres dépendances...
  ) {}

  /**
   * Description de la méthode
   * @param param - Description du paramètre
   * @returns Description du retour
   */
  async methodName(param: Type): Promise<Result> {
    // 1. Validation des paramètres
    if (!param) {
      return { success: false, error: "Invalid param" };
    }

    // 2. Logique métier
    const data = this.processData(param);

    // 3. Appel au repository
    const result = await this.xxxRepository.create(data);

    // 4. Post-processing et retour
    return { success: true, data: result };
  }

  // Méthodes privées pour la logique interne
  private processData(param: Type): ProcessedData {
    // ...
  }
}
```

### Pattern de retour

Les services retournent généralement un objet `Result` :

```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// Exemple
const result = await service.createTeam(data);
if (result.success) {
  console.log(result.data); // Team
} else {
  console.error(result.error); // string
}
```

### Validation

La validation se fait **dans le service**, pas dans le repository :

```typescript
// ✅ BON
async createTeam(data: CreateTeamData): Promise<Result> {
  if (data.name.length < 3) {
    return { success: false, error: "Name too short" };
  }
  return await this.teamRepository.create(data);
}

// ❌ MAUVAIS - ne pas valider dans l'UI
// Ni dans le repository
```

## 🔄 Relations entre services

Certains services dépendent d'autres services :

```
TeamService
  ├── TeamRepository
  ├── ClubMemberRepository (vérifier permissions)
  └── SubscriptionService (vérifier limites)

MatchDataService
  ├── ActionRepository (SQLite)
  └── Supabase (cloud sync)

MatchSyncService
  ├── MatchDataService (réutilise la logique)
  └── Supabase
```

**Important** : Ne jamais créer de dépendances circulaires !

## 🧪 Testing (à venir)

Les services sont conçus pour être testables :

```typescript
// Mock du repository
const mockTeamRepo: ITeamRepository = {
  create: jest.fn().mockResolvedValue(mockTeam),
  findById: jest.fn(),
  // ...
};

// Test du service
const teamService = new TeamService(mockTeamRepo);
const result = await teamService.createTeam(data);
expect(result.success).toBe(true);
```

## 🚀 Ajouter un nouveau service

1. **Créer le fichier** : `XxxService.ts`
2. **Définir la classe** :
   ```typescript
   export class XxxService {
     constructor(private xxxRepository: IXxxRepository) {}

     async myMethod(): Promise<Result> {
       // logique
     }
   }
   ```
3. **Ajouter au ServiceFactory** :
   ```typescript
   private static xxxServiceInstance: XxxService | null = null;

   static getXxxService(supabase: SupabaseClient): XxxService {
     if (!this.xxxServiceInstance) {
       const repo = new SupabaseXxxRepository(supabase);
       this.xxxServiceInstance = new XxxService(repo);
     }
     return this.xxxServiceInstance;
   }
   ```
4. **Utiliser dans l'app** :
   ```typescript
   const service = ServiceFactory.getXxxService(supabase);
   ```

## 📚 Voir aussi

- [repositories/README.md](../repositories/README.md) - Couche d'accès aux données
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Principes SOLID et Design Patterns
- [MATCH_SYNC_USAGE.md](../MATCH_SYNC_USAGE.md) - Hook de synchronisation des matchs
