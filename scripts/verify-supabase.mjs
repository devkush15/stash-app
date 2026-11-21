import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const names = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "STASH_TEST_EMAIL_A",
  "STASH_TEST_PASSWORD_A",
  "STASH_TEST_EMAIL_B",
  "STASH_TEST_PASSWORD_B",
];
for (const name of names)
  if (!process.env[name])
    throw new Error(
      `Missing ${name}. See README.md. This test requires two dedicated confirmed test accounts.`,
    );
const client = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
const alice = client(),
  bob = client(),
  anonymous = client();
const marker = randomUUID();
const url = `https://example.org/stash-verification/${marker}`;
let aliceId, bobId;
try {
  const a = await alice.auth.signInWithPassword({
    email: process.env.STASH_TEST_EMAIL_A,
    password: process.env.STASH_TEST_PASSWORD_A,
  });
  const b = await bob.auth.signInWithPassword({
    email: process.env.STASH_TEST_EMAIL_B,
    password: process.env.STASH_TEST_PASSWORD_B,
  });
  assert.ifError(a.error);
  assert.ifError(b.error);
  assert.notEqual(a.data.user.id, b.data.user.id, "Use two different accounts");
  const item = {
    user_id: a.data.user.id,
    original_url: url,
    normalized_url: url,
    platform: "website",
    title: `Verification ${marker}`,
  };
  const saved = await alice.from("saved_items").insert(item).select().single();
  assert.ifError(saved.error);
  aliceId = saved.data.id;
  assert.equal(saved.data.processing_status, "saved");
  const refreshed = await alice
    .from("saved_items")
    .select("id")
    .eq("id", aliceId)
    .single();
  assert.ifError(refreshed.error);
  assert.equal(refreshed.data.id, aliceId);
  const search = await alice
    .from("saved_items")
    .select("id")
    .ilike("search_document", `%${marker}%`);
  assert.ifError(search.error);
  assert.equal(search.data.length, 1);
  const duplicate = await alice.from("saved_items").insert(item);
  assert.equal(duplicate.error?.code, "23505");
  const bSave = await bob
    .from("saved_items")
    .insert({ ...item, user_id: b.data.user.id })
    .select("id")
    .single();
  assert.ifError(bSave.error);
  bobId = bSave.data.id;
  const other = await bob.from("saved_items").select().eq("id", aliceId);
  assert.ifError(other.error);
  assert.deepEqual(other.data, []);
  const changed = await bob
    .from("saved_items")
    .update({ title: "Access denied" })
    .eq("id", aliceId)
    .select("id");
  assert.ifError(changed.error);
  assert.deepEqual(changed.data, []);
  const deleted = await bob
    .from("saved_items")
    .delete()
    .eq("id", aliceId)
    .select("id");
  assert.ifError(deleted.error);
  assert.deepEqual(deleted.data, []);
  const spoof = await bob
    .from("saved_items")
    .insert({
      ...item,
      original_url: `${url}/spoof`,
      normalized_url: `${url}/spoof`,
    });
  assert.ok(spoof.error, "Cross-owner insert must be denied");
  const reassign = await alice
    .from("saved_items")
    .update({ user_id: b.data.user.id })
    .eq("id", aliceId);
  assert.ok(reassign.error, "Owner reassignment must be denied");
  const anonRead = await anonymous
    .from("saved_items")
    .select("id")
    .eq("id", aliceId);
  assert.ok(anonRead.error || anonRead.data.length === 0);
  const ownDelete = await alice
    .from("saved_items")
    .delete()
    .eq("id", aliceId)
    .select("id");
  assert.ifError(ownDelete.error);
  assert.equal(ownDelete.data.length, 1);
  const afterDelete = await alice
    .from("saved_items")
    .select("id")
    .eq("id", aliceId);
  assert.ifError(afterDelete.error);
  assert.deepEqual(afterDelete.data, []);
  console.log(
    "PASS: hosted authentication, save, fresh read, search, duplicates, deletion, and two-account direct API isolation.",
  );
} finally {
  if (aliceId) await alice.from("saved_items").delete().eq("id", aliceId);
  if (bobId) await bob.from("saved_items").delete().eq("id", bobId);
  await Promise.all([alice.auth.signOut(), bob.auth.signOut()]);
}
