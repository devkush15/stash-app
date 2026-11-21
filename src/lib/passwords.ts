import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
const scrypt = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCallback(password, salt, 64, options, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
const options = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 };
export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt);
  return `scrypt$${salt}$${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [scheme, salt, key] = encoded.split("$");
  if (scheme !== "scrypt" || !salt || !key || !/^[a-f0-9]{128}$/.test(key))
    return false;
  const hash = await scrypt(password, salt);
  return timingSafeEqual(hash, Buffer.from(key, "hex"));
}
