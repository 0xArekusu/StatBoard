/**
 * Club Domain Model
 * Represents a basketball club entity
 */
export interface Club {
  id: string;
  name: string;
  acronym: string;
  code: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  courtBackgroundColor: string;
  courtLineColor: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Club creation data (without auto-generated fields)
 */
export interface CreateClubData {
  name: string;
  acronym: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  courtBackgroundColor: string;
  courtLineColor: string;
}

/**
 * Club update data (partial)
 */
export interface UpdateClubData {
  name?: string;
  acronym?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  courtBackgroundColor?: string;
  courtLineColor?: string;
}
