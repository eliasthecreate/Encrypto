/**
 * Crypto Keys Module
 *
 * Each user gets one RSA-OAEP key pair:
 *   - Private key → stored in IndexedDB (non-extractable)
 *   - Public key  → uploaded to Supabase public_keys table
 *
 * Fetching another user's public key pulls from Supabase.
 */

import { supabase } from "../supabase";

const DB_NAME = "campus-connect-keys";
const STORE_NAME = "keys";
const KEY_ALGORITHM = "RSA-OAEP";
const KEY_LENGTH = 2048;
const HASH = "SHA-256";

// ─── IndexedDB helpers ──────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storePrivateKey(userId: string, key: CryptoKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(key, `private-${userId}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadPrivateKey(userId: string): Promise<CryptoKey | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(`private-${userId}`);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function storePublicKeyPem(userId: string, pem: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(pem, `public-${userId}`);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadLocalPublicKeyPem(userId: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(`public-${userId}`);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

// ─── PEM conversion helpers ─────────────────────────────────────

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function exportPublicKeyToPem(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", key);
  const b64 = arrayBufferToBase64(exported);
  return `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----`;
}

async function importPublicKeyFromPem(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, "");
  const buf = base64ToArrayBuffer(b64);
  return crypto.subtle.importKey(
    "spki",
    buf,
    { name: KEY_ALGORITHM, hash: HASH },
    true,
    ["encrypt"]
  );
}

// ─── Generate key pair ──────────────────────────────────────────

export async function generateKeyPair(userId: string): Promise<{ publicKeyPem: string }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: KEY_ALGORITHM,
      modulusLength: KEY_LENGTH,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: HASH,
    },
    false, // private key is non-extractable
    ["encrypt", "decrypt"]
  );

  // Store private key in IndexedDB
  await storePrivateKey(userId, keyPair.privateKey);

  // Export and store public key PEM
  const publicKeyPem = await exportPublicKeyToPem(keyPair.publicKey);
  await storePublicKeyPem(userId, publicKeyPem);

  return { publicKeyPem };
}

// ─── Get own private key ───────────────────────────────────────

export async function getOwnPrivateKey(userId: string): Promise<CryptoKey | null> {
  return loadPrivateKey(userId);
}

// ─── Get another user's public key ─────────────────────────────

let publicKeyCache = new Map<string, CryptoKey>();

export async function fetchUserPublicKey(userId: string): Promise<CryptoKey | null> {
  // Check in-memory cache first
  if (publicKeyCache.has(userId)) {
    return publicKeyCache.get(userId)!;
  }

  // Check local IndexedDB
  const localPem = await loadLocalPublicKeyPem(userId);
  if (localPem) {
    try {
      const key = await importPublicKeyFromPem(localPem);
      publicKeyCache.set(userId, key);
      return key;
    } catch {
      // PEM might be stale, fetch from server
    }
  }

  // Fetch from Supabase
  const { data } = await (supabase as any)
    .from("public_keys")
    .select("public_key_pem")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  const imported = await importPublicKeyFromPem(data.public_key_pem);
  publicKeyCache.set(userId, imported);
  return imported;
}

// ─── Upload public key to Supabase ─────────────────────────────

export async function uploadPublicKey(userId: string, publicKeyPem: string): Promise<void> {
  const { error } = await (supabase as any).from("public_keys").upsert(
    { user_id: userId, public_key_pem: publicKeyPem },
    { onConflict: "user_id" }
  );
  if (error) {
    console.error("Failed to upload public key:", error.message);
    throw error;
  }
}

// ─── Clear cache (for testing / reset) ─────────────────────────

export function clearPublicKeyCache(): void {
  publicKeyCache.clear();
}
