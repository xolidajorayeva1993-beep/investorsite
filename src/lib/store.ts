/**
 * Firestore data store — replaces all local JSON file (fs) operations.
 * All data is persisted in Cloud Firestore, which works across any number
 * of Cloud Run instances without data loss on restart.
 */
import { db } from "./firebase-admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

/** Read all documents from a collection as an array, sorted by _createdAt */
export async function getAll<T extends AnyRecord = AnyRecord>(
  collection: string
): Promise<T[]> {
  try {
    const snap = await db.collection(collection).get();
    if (snap.empty) return [];
    const docs = snap.docs.map((d) => d.data() as T);
    docs.sort((a, b) =>
      String(a._createdAt ?? "").localeCompare(String(b._createdAt ?? ""))
    );
    return docs;
  } catch (err) {
    console.error(`store.getAll(${collection}) error:`, err);
    return [];
  }
}

/** Find one document by a field value */
export async function findOne<T extends AnyRecord = AnyRecord>(
  collection: string,
  field: string,
  value: unknown
): Promise<T | null> {
  try {
    const snap = await db
      .collection(collection)
      .where(field, "==", value)
      .limit(1)
      .get();
    return snap.empty ? null : (snap.docs[0].data() as T);
  } catch {
    return null;
  }
}

/** Get a single document by ID */
export async function getDoc<T extends AnyRecord = AnyRecord>(
  collection: string,
  id: string
): Promise<T | null> {
  try {
    const snap = await db.collection(collection).doc(id).get();
    return snap.exists ? (snap.data() as T) : null;
  } catch {
    return null;
  }
}

/** Add a new document with auto-set _createdAt/_updatedAt */
export async function addDoc(
  collection: string,
  id: string,
  data: AnyRecord
): Promise<void> {
  const now = new Date().toISOString();
  await db.collection(collection).doc(id).set({
    ...data,
    _createdAt: now,
    _updatedAt: now,
  });
}

/** Create or fully replace a document (preserves _createdAt if exists) */
export async function upsert(
  collection: string,
  id: string,
  data: AnyRecord
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await db.collection(collection).doc(id).get();
  const createdAt = existing.exists
    ? (existing.data()?._createdAt ?? now)
    : now;
  await db.collection(collection).doc(id).set({
    ...data,
    _createdAt: createdAt,
    _updatedAt: now,
  });
}

/** Update specific fields of an existing document */
export async function updateFields(
  collection: string,
  id: string,
  updates: AnyRecord
): Promise<void> {
  await db.collection(collection).doc(id).update({
    ...updates,
    _updatedAt: new Date().toISOString(),
  });
}

/** Delete a document */
export async function deleteDoc(
  collection: string,
  id: string
): Promise<void> {
  await db.collection(collection).doc(id).delete();
}

/** Read a config document (single-doc collections like deductions, owner_settings) */
export async function getConfig<T extends AnyRecord = AnyRecord>(
  collection: string,
  docId: string,
  fallback: T
): Promise<T> {
  try {
    const snap = await db.collection(collection).doc(docId).get();
    if (!snap.exists) return fallback;
    return { ...fallback, ...snap.data() } as T;
  } catch {
    return fallback;
  }
}

/** Write/replace a config document */
export async function setConfig(
  collection: string,
  docId: string,
  data: AnyRecord
): Promise<void> {
  await db.collection(collection).doc(docId).set({
    ...data,
    _updatedAt: new Date().toISOString(),
  });
}

/** Upload a buffer to Firebase Storage and return a long-lived signed URL */
export async function uploadToStorage(
  folder: string,
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const { getStorage } = await import("firebase-admin/storage");
  const file = getStorage().bucket().file(`${folder}/${fileName}`);
  await file.save(buffer, { metadata: { contentType } });
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: "2099-01-01",
  });
  return url;
}

/** Get a short-lived (~1h) signed URL for an existing Storage file */
export async function getStorageSignedUrl(
  folder: string,
  fileName: string
): Promise<string> {
  const { getStorage } = await import("firebase-admin/storage");
  const file = getStorage().bucket().file(`${folder}/${fileName}`);
  const [exists] = await file.exists();
  if (!exists) throw new Error(`Fayl topilmadi: ${folder}/${fileName}`);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 3_600_000,
  });
  return url;
}
