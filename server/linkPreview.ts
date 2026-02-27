import * as cheerio from "cheerio";
import { lookup } from "dns/promises";

export interface LinkPreview {
  title: string | null;
  description: string | null;
  image: string | null;
}

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc/i,
  /^fd/i,
  /^fe80/i,
];

function isPrivateIP(ip: string): boolean {
  return PRIVATE_RANGES.some(r => r.test(ip));
}

async function isSafeUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "[::1]") return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) && isPrivateIP(hostname)) return false;
    try {
      const result = await lookup(hostname);
      if (isPrivateIP(result.address)) return false;
    } catch {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  const empty: LinkPreview = { title: null, description: null, image: null };
  try {
    if (!(await isSafeUrl(url))) return empty;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "CTRXL48Bot/1.0",
        "Accept": "text/html",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!res.ok) return empty;

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return empty;

    const maxSize = 512 * 1024;
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > maxSize) return empty;

    const html = (await res.text()).slice(0, maxSize);
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text() ||
      null;

    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      null;

    let image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      null;

    if (image && !image.startsWith("http")) {
      try {
        const base = new URL(url);
        image = new URL(image, base).href;
      } catch {
        image = null;
      }
    }

    return {
      title: title ? title.slice(0, 200) : null,
      description: description ? description.slice(0, 500) : null,
      image,
    };
  } catch {
    return empty;
  }
}
