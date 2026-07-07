import "server-only";

import bcrypt from "bcryptjs";

// bcryptjs is pure-JS and blocks the event loop while hashing, so the cost factor
// directly gates how long a login / account-create freezes the server. 10 is the
// OWASP-recommended minimum and hashes ~2.5x faster than 12 — the difference
// between a snappy save and a multi-second "กำลังบันทึก…" hang on constrained
// (e.g. containerised) CPUs. Existing higher-cost hashes still verify fine.
const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
