import { lookup } from "node:dns/promises";
import { isIP, type LookupFunction } from "node:net";
import ipaddr from "ipaddr.js";
import { Agent, request } from "undici";
import { load } from "cheerio";
import type { Platform } from "./database.types";

export type Extracted = {
  title: string | null;
  description: string | null;
  text: string;
  level: "none" | "metadata" | "text";
  userNote?: string;
};
export function publicAddress(address: string) {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}
export function fetchableUrl(value: string) {
  const url = new URL(value),
    host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port ||
    isIP(host) ||
    !host.includes(".") ||
    /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)
  )
    throw new Error("Restricted destination");
  return url;
}
// Resolve, reject every private/reserved address, and pin the validated answers
// in the connector. Redirects are fetched manually and revalidated per hop.
export async function safeFetch(value: string, headOnly = false) {
  let url = fetchableUrl(value);
  const signal = AbortSignal.timeout(12000);
  const maxBytes = headOnly ? 1048576 : 524288;
  for (let hop = 0; hop < 4; hop++) {
    const addresses = await Promise.race([
      lookup(url.hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DNS timeout")), 3000),
      ),
    ]);
    if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
      throw new Error("Restricted destination");
    const pinned: LookupFunction = (_host, options, callback) => {
      if (options.all) callback(null, addresses);
      else callback(null, addresses[0].address, addresses[0].family);
    };
    const dispatcher = new Agent({
      connect: { lookup: pinned, timeout: 4000 },
      maxHeaderSize: 16384,
    });
    try {
      const response = await request(url, {
        dispatcher,
        signal,
        headersTimeout: 8000,
        bodyTimeout: 8000,
        headers: {
          "user-agent": "Stash/0.2 (+public-link-metadata)",
          accept: "text/html,application/json;q=0.9,text/plain;q=0.8",
          "accept-encoding": "identity",
        },
      });
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.body.destroy();
        url = fetchableUrl(
          new URL(String(response.headers.location), url).href,
        );
        continue;
      }
      if (response.statusCode !== 200) {
        response.body.destroy();
        throw new Error("Source unavailable");
      }
      const type = String(response.headers["content-type"] || "").toLowerCase();
      if (
        !/text\/(html|plain)|application\/(json|xhtml\+xml)/.test(type) ||
        (response.headers["content-encoding"] &&
          response.headers["content-encoding"] !== "identity") ||
        (!headOnly && Number(response.headers["content-length"]) > maxBytes)
      ) {
        response.body.destroy();
        throw new Error("Unsupported response");
      }
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > maxBytes) {
          response.body.destroy();
          throw new Error("Response too large");
        }
        chunks.push(Buffer.from(chunk));
        if (
          headOnly &&
          Buffer.concat(chunks).includes(Buffer.from("</head>"))
        ) {
          response.body.destroy();
          break;
        }
      }
      let body = Buffer.concat(chunks).toString("utf8");
      if (headOnly && body.includes("</head>"))
        body = body.slice(0, body.indexOf("</head>") + 7);
      return { body, type };
    } finally {
      await dispatcher.close();
    }
  }
  throw new Error("Too many redirects");
}
const clean = (value: string) => value.replace(/\s+/g, " ").trim();
export function parseInstagramHtml(html: string): Extracted {
  const $ = load(html);
  // Public Open Graph fields only. Never treat login-shell body text as a post.
  const rawTitle = clean($('meta[property="og:title"]').attr("content") || "");
  const rawDescription = clean(
    $('meta[property="og:description"]').attr("content") || "",
  );
  const generic =
    /^(?:instagram|instagram photos and videos|log in.*|sign up.*|see instagram photos and videos.*)$/i;
  const title =
    !generic.test(rawTitle) &&
    !/log in|sign in|page not found|access denied/i.test(rawTitle)
      ? rawTitle
          .replace(/^.+? on Instagram:\s*["“]?/i, "")
          .replace(/["”]\.?$/, "")
          .slice(0, 200) || null
      : null;
  const description =
    !generic.test(rawDescription) &&
    !/create an account|log in to|sign up to/i.test(rawDescription)
      ? rawDescription.slice(0, 2000) || null
      : null;
  return {
    title,
    description,
    text: "",
    level: title || description ? "metadata" : "none",
  };
}
export function parseHtml(html: string): Extracted {
  const $ = load(html);
  const title =
    clean(
      $('meta[property="og:title"]').attr("content") || $("title").text(),
    ).slice(0, 200) || null;
  const description =
    clean(
      $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        "",
    ).slice(0, 2000) || null;
  if (
    /just a moment|access denied|captcha|log in|sign in|login • instagram|page not found/i.test(
      title || "",
    )
  )
    return { title: null, description: null, text: "", level: "none" };
  $(
    "script,style,noscript,nav,header,footer,form,aside,[hidden],[aria-hidden='true']",
  ).remove();
  const root = $("article").first().length
    ? $("article").first()
    : $("main").first().length
      ? $("main").first()
      : $("body");
  const text = clean(root.text()).slice(0, 9000);
  return {
    title,
    description,
    text,
    level:
      text.length >= 200 ? "text" : title || description ? "metadata" : "none",
  };
}
export async function extractContent(
  url: string,
  platform: Platform,
): Promise<Extracted> {
  const empty: Extracted = {
    title: null,
    description: null,
    text: "",
    level: "none",
  };
  try {
    if (platform === "youtube") {
      const target = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const { body } = await safeFetch(target);
      const data = JSON.parse(body);
      if (typeof data.title !== "string") return empty;
      return {
        title: clean(data.title).slice(0, 200),
        description:
          typeof data.author_name === "string"
            ? `By ${data.author_name}`
            : null,
        text: "",
        level: "metadata",
      };
    }
    if (platform === "x") {
      const { body } = await safeFetch(
        `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`,
      );
      const data = JSON.parse(body),
        $ = load(typeof data.html === "string" ? data.html : "");
      const text = clean($("blockquote p").text());
      return {
        title: text.slice(0, 200) || null,
        description: null,
        text,
        level: text ? "text" : "none",
      };
    }
    if (platform === "instagram") {
      // oEmbed is restricted by Meta to displaying embeds; its response is never
      // persisted or sent to AI. Read only the legitimately public page header.
      const { body } = await safeFetch(url, true);
      return parseInstagramHtml(body);
    }
    const { body, type } = await safeFetch(url);
    if (type.startsWith("text/plain"))
      return {
        title: null,
        description: null,
        text: clean(body).slice(0, 9000),
        level: body.trim().length >= 200 ? "text" : "metadata",
      };
    return parseHtml(body);
  } catch {
    return empty;
  }
}
