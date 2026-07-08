import "server-only";

import { hash, verify } from "@node-rs/bcrypt";

// @node-rs/bcrypt is a native (Rust) bcrypt that runs off the main thread, so
// hashing never blocks Node's event loop the way pure-JS bcryptjs did — that
// blocking was what made account-create/reset hang the whole server (and abort
// the next request's response) on constrained container CPUs. Cost 10 is the
// OWASP-recommended minimum; it verifies existing bcryptjs ($2a/$2b) hashes fine.
const COST = 10;

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, COST);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return verify(plain, hashed);
}
