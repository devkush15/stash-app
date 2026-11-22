import { randomUUID } from "node:crypto";
import type { Client, InValue, Row } from "@libsql/client";
import type { SavedItem, User } from "./database.types";
import { ensureSchema } from "./schema";

function item(row: Row): SavedItem {
  return {
    ...row,
    platform: row.platform === "whatsapp" ? "website" : row.platform,
    tags: JSON.parse(String(row.tags || "[]")),
  } as unknown as SavedItem;
}
export class Store {
  private initialized?: Promise<unknown>;
  constructor(public client: Client) {}
  async ready() {
    await (this.initialized ??= ensureSchema(this.client).catch((error) => {
      this.initialized = undefined;
      throw error;
    }));
  }
  async register(username: string, passwordHash: string): Promise<User> {
    await this.ready();
    const user = { id: randomUUID(), username };
    await this.client.execute({
      sql: "INSERT INTO users(id,username,password_hash) VALUES(?,?,?)",
      args: [user.id, username, passwordHash],
    });
    return user;
  }
  async findUser(username: string) {
    await this.ready();
    const r = await this.client.execute({
      sql: "SELECT id,username,password_hash FROM users WHERE username=?",
      args: [username],
    });
    return r.rows[0] as unknown as
      (User & { password_hash: string }) | undefined;
  }
  async createSession(userId: string, hash: string, expires: string) {
    await this.ready();
    await this.client.execute({
      sql: "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
      args: [hash, userId, expires],
    });
  }
  async session(hash: string): Promise<User | null> {
    await this.ready();
    const r = await this.client.execute({
      sql: "SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",
      args: [hash, new Date().toISOString()],
    });
    return r.rows[0]
      ? { id: String(r.rows[0].id), username: String(r.rows[0].username) }
      : null;
  }
  async logout(hash: string) {
    await this.ready();
    await this.client.execute({
      sql: "DELETE FROM sessions WHERE token_hash=?",
      args: [hash],
    });
  }
  async list(userId: string, platform = "all"): Promise<SavedItem[]> {
    await this.ready();
    const r = await this.client.execute({
      sql: "SELECT * FROM saved_items WHERE user_id=? AND (?='all' OR platform=? OR (?='website' AND platform='whatsapp')) ORDER BY created_at DESC,id DESC LIMIT 500",
      args: [userId, platform, platform, platform],
    });
    return r.rows.map(item);
  }
  async get(userId: string, id: string) {
    await this.ready();
    const r = await this.client.execute({
      sql: "SELECT * FROM saved_items WHERE user_id=? AND id=?",
      args: [userId, id],
    });
    return r.rows[0] ? item(r.rows[0]) : null;
  }
  async save(
    userId: string,
    link: { original_url: string; normalized_url: string; platform: string },
    title: string | null,
    note: string | null = null,
    tags: string[] = [],
  ) {
    await this.ready();
    const id = randomUUID(),
      now = new Date().toISOString();
    await this.client.execute({
      sql: "INSERT INTO saved_items(id,user_id,original_url,normalized_url,platform,title,user_note,title_edited,tags,tags_edited,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      args: [
        id,
        userId,
        link.original_url,
        link.normalized_url,
        link.platform,
        title,
        note,
        title ? 1 : 0,
        JSON.stringify(tags),
        tags.length ? 1 : 0,
        now,
        now,
      ],
    });
    return (await this.get(userId, id))!;
  }
  async update(userId: string, id: string, values: Partial<SavedItem>) {
    const allowed = [
      "title",
      "title_edited",
      "tags_edited",
      "user_note",
      "description",
      "summary",
      "category",
      "tags",
      "source_text",
      "metadata_level",
      "indexing_note",
      "processing_status",
      "processing_started_at",
      "ai_processed_at",
    ];
    const entries = Object.entries(values).filter(([key]) =>
      allowed.includes(key),
    );
    if (!entries.length) return this.get(userId, id);
    await this.ready();
    await this.client.execute({
      sql: `UPDATE saved_items SET ${entries.map(([key]) => `${key}=?`).join(",")},updated_at=? WHERE user_id=? AND id=?`,
      args: [
        ...entries.map(
          ([key, value]) =>
            (key === "tags" ? JSON.stringify(value) : value) as InValue,
        ),
        new Date().toISOString(),
        userId,
        id,
      ],
    });
    return this.get(userId, id);
  }
  async claimIndex(userId: string, id: string) {
    await this.ready();
    const now = new Date().toISOString();
    const r = await this.client.execute({
      sql: "UPDATE saved_items SET processing_status='processing',processing_started_at=? WHERE user_id=? AND id=? AND ai_processed_at IS NULL AND processing_status<>'limited' AND (processing_status<>'processing' OR processing_started_at<?) RETURNING *",
      args: [now, userId, id, new Date(Date.now() - 120000).toISOString()],
    });
    return r.rows[0] ? item(r.rows[0]) : null;
  }
  async edit(
    userId: string,
    id: string,
    values: { title: string | null; note: string | null; tags: string[] },
  ) {
    await this.ready();
    const tx = await this.client.transaction("write");
    try {
      const result = await tx.execute({
        sql: "SELECT * FROM saved_items WHERE user_id=? AND id=?",
        args: [userId, id],
      });
      if (!result.rows[0]) {
        await tx.rollback();
        return null;
      }
      const before = item(result.rows[0]);
      if (
        before.processing_status === "processing" &&
        before.processing_started_at &&
        Date.parse(before.processing_started_at) > Date.now() - 120000
      )
        throw new Error("ANALYSIS_BUSY");
      const changedNote = values.note !== before.user_note;
      const titleEdited =
        values.title === before.title
          ? before.title_edited
          : values.title
            ? 1
            : 0;
      const tagsEdited =
        JSON.stringify(values.tags) === JSON.stringify(before.tags)
          ? before.tags_edited
          : 1;
      await tx.execute({
        sql: "UPDATE saved_items SET title=?,user_note=?,tags=?,title_edited=?,tags_edited=?,updated_at=?,summary=?,category=?,ai_processed_at=?,processing_status=?,processing_started_at=NULL WHERE user_id=? AND id=?",
        args: [
          values.title,
          values.note,
          JSON.stringify(values.tags),
          titleEdited,
          tagsEdited,
          new Date().toISOString(),
          changedNote ? null : before.summary,
          changedNote ? null : before.category,
          changedNote ? null : before.ai_processed_at,
          changedNote ? "pending" : before.processing_status,
          userId,
          id,
        ],
      });
      await tx.commit();
      return { item: (await this.get(userId, id))!, reanalyze: changedNote };
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
  }
  async delete(userId: string, id: string) {
    await this.ready();
    const r = await this.client.execute({
      sql: "DELETE FROM saved_items WHERE user_id=? AND id=?",
      args: [userId, id],
    });
    return r.rowsAffected > 0;
  }
  async limit(key: string, cap: number, windowMs: number) {
    await this.ready();
    const bucket = String(Math.floor(Date.now() / windowMs));
    const r = await this.client.execute({
      sql: "INSERT INTO usage_counts(name,bucket,count) VALUES(?,?,1) ON CONFLICT(name,bucket) DO UPDATE SET count=count+1 RETURNING count",
      args: [key, bucket],
    });
    return Number(r.rows[0].count) <= cap;
  }
  async tagCatalog(userId: string, items?: SavedItem[]) {
    await this.ready();
    const result = await this.client.execute({
      sql: "SELECT custom_tags FROM users WHERE id=?",
      args: [userId],
    });
    const custom = JSON.parse(
      String(result.rows[0]?.custom_tags || "[]"),
    ) as string[];
    const links = items || (await this.list(userId));
    return [
      ...new Set([...custom, ...links.flatMap((link) => link.tags)]),
    ].sort((a, b) => a.localeCompare(b));
  }
  async addTag(userId: string, tag: string) {
    await this.ready();
    const tx = await this.client.transaction("write");
    try {
      const result = await tx.execute({
        sql: "SELECT custom_tags FROM users WHERE id=?",
        args: [userId],
      });
      const tags = [
        ...new Set([
          ...JSON.parse(String(result.rows[0]?.custom_tags || "[]")),
          tag,
        ]),
      ] as string[];
      if (tags.length > 32) throw new Error("TAG_LIMIT");
      await tx.execute({
        sql: "UPDATE users SET custom_tags=? WHERE id=?",
        args: [JSON.stringify(tags), userId],
      });
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
    return this.tagCatalog(userId);
  }
  async aiQuota(userId: string, kind: "save" | "search") {
    await this.ready();
    const day = new Date().toISOString().slice(0, 10);
    const tx = await this.client.transaction("write");
    try {
      const keys = [`ai:${kind}:${userId}`, "ai:global"];
      const r = await tx.execute({
        sql: "SELECT name,count FROM usage_counts WHERE bucket=? AND name IN (?,?)",
        args: [day, ...keys],
      });
      const counts = new Map(
        r.rows.map((row) => [String(row.name), Number(row.count)]),
      );
      if (
        (counts.get(keys[0]) || 0) >= (kind === "save" ? 5 : 20) ||
        (counts.get(keys[1]) || 0) >= 50
      ) {
        await tx.rollback();
        return false;
      }
      for (const key of keys)
        await tx.execute({
          sql: "INSERT INTO usage_counts(name,bucket,count) VALUES(?,?,1) ON CONFLICT(name,bucket) DO UPDATE SET count=count+1",
          args: [key, day],
        });
      await tx.commit();
      return true;
    } finally {
      tx.close();
    }
  }
}
