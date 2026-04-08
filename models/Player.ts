export interface Player {
  id: string;
  teamId: string;
  name: string;
  jerseyNumber: number;
  photoUrl?: string;
  licenseNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlayerData {
  teamId: string;
  name: string;
  jerseyNumber: number;
  photoUrl?: string;
  licenseNumber?: string;
}

export interface UpdatePlayerData {
  name?: string;
  jerseyNumber?: number;
  photoUrl?: string;
  licenseNumber?: string;
}
