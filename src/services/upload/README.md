# Match Upload Service

Architecture for uploading matches to remote server with flexible backend support.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BoardScreen                          │
│                  (when match ends)                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              ApiServiceFactory                          │
│         (creates API service + adapter)                 │
└─────────────────────────────────────────────────────────┘
                          │
                    ┌─────┴─────┐
                    ▼           ▼
        ┌──────────────┐  ┌──────────────────┐
        │  ApiService  │  │  PayloadAdapter  │
        │  (Supabase)  │  │   (Transform)    │
        └──────────────┘  └──────────────────┘
                    │           │
                    └─────┬─────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│             MatchUploadService                          │
│  1. Load from local (repositories)                      │
│  2. Transform (adapter)                                 │
│  3. Upload (api service)                                │
│  4. Delete local                                        │
└─────────────────────────────────────────────────────────┘
```

## 📦 Components

### Interfaces (Contracts)
- **`IMatchApiService`** : Contract for API services
- **`IPayloadAdapter<T>`** : Contract for payload transformation
- **`MatchData`** : Internal domain model (never changes)

### Implementations
- **`SupabaseMatchApiService`** : Supabase implementation
- **`SupabasePayloadAdapter`** : Supabase payload format

### Services
- **`MatchUploadService`** : Orchestrates upload + cleanup
- **`ApiServiceFactory`** : Creates appropriate services

## 🚀 Usage Example

```typescript
import { ApiServiceFactory } from './services/config/ApiServiceFactory';
import { MatchUploadService } from './services/upload/MatchUploadService';
import { MatchRepository } from './services/database/MatchRepository';
import { ActionRepository } from './services/database/ActionRepository';

// In BoardScreen when match ends:
const handleEndMatch = async () => {
  try {
    // 1. Get API service configuration
    const { apiService, payloadAdapter } = ApiServiceFactory.createMatchApiService();

    // 2. Create upload service
    const uploadService = new MatchUploadService(
      new MatchRepository(),
      new ActionRepository(),
      apiService,
      payloadAdapter
    );

    // 3. Upload and cleanup
    await uploadService.uploadAndCleanup(currentMatch.id);

    Alert.alert('Succès', 'Match sauvegardé sur le serveur !');
    navigation.navigate('MainMenu');
  } catch (error) {
    Alert.alert('Erreur', 'Impossible d\'uploader. Le match reste en local.');
    console.error(error);
  }
};
```

## 🔄 Changing Backend

To switch from Supabase to another backend:

### 1. Create new adapter
```typescript
// src/services/api/adapters/RestPayloadAdapter.ts
export class RestPayloadAdapter implements IPayloadAdapter<RestPayload> {
  adapt(data: MatchData): RestPayload {
    return {
      // Your REST API format
    };
  }
}
```

### 2. Create new API service
```typescript
// src/services/api/RestMatchApiService.ts
export class RestMatchApiService implements IMatchApiService {
  async uploadMatch(payload: RestPayload): Promise<void> {
    // Your REST API implementation
  }
}
```

### 3. Update factory
```typescript
// In ApiServiceFactory.ts
case 'rest':
  const restAdapter = new RestPayloadAdapter();
  const restService = new RestMatchApiService(url, key, restAdapter);
  return { apiService: restService, payloadAdapter: restAdapter };
```

### 4. Change config
```typescript
// Set environment variable
process.env.API_TYPE = 'rest';
```

**No other code needs to change!** ✨

## 🎯 Design Patterns Used

- **Strategy Pattern** : Interchangeable API services
- **Adapter Pattern** : Payload transformation
- **Factory Pattern** : Service creation
- **Repository Pattern** : Data access abstraction

## 🔐 Environment Variables

Required for Supabase:
```
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
```

## 🧪 Testing

Mock the interfaces for unit tests:

```typescript
const mockApiService: IMatchApiService = {
  uploadMatch: jest.fn().mockResolvedValue(undefined)
};

const mockAdapter: IPayloadAdapter<any> = {
  adapt: jest.fn().mockReturnValue({})
};

const service = new MatchUploadService(
  mockMatchRepo,
  mockActionRepo,
  mockApiService,
  mockAdapter
);
```
