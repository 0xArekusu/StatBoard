/**
 * UUID Generator
 *
 * Uses expo-crypto for cryptographically secure UUIDs
 */
import * as Crypto from 'expo-crypto';

/**
 * Generate a UUID v4
 * @returns UUID string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export function generateUUID(): string {
  return Crypto.randomUUID();
}
