import { NextResponse } from "next/server";
import Parser from "rss-parser";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const importKey = process.env.IMPORT_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

type FeedItem = {
  title?: string;
  link?: string;
  guid?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  creator?: string;
  author?: string;
};

function normaliseDate(item: FeedItem): string | null {
  const d = item.isoDate || item.pubDate;
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

export async function GET(req: Request) {
  // Require key
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!importKey) {
    return new NextResponse("Missing IMPORT_KEY", { status: 500 });
  }

  if (key !== importKey) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Missing env vars" }, { status: 500 });
  }

  const parser = new Parser({
    timeout: 15000,
    headers: { "User-Agent": "ToneShiftGearNews/1.0" },
  });

  const { data: sources, error: srcErr } = await supabase
    .from("sources")
    .select("id,name,url")
    .eq("enabled", true);

  if (srcErr) {
    return NextResponse.json({ ok: false, error: srcErr.message }, { status: 500 });
  }

  let feedsFetched = 0;
  let itemsUpserted = 0;
  const errors: Array<{ source: string; error: string }> = [];

  for (const s of sources ?? []) {
    try {
      const feed = await parser.parseURL(s.url);
      feedsFetched++;

      const items = (feed.items ?? []).slice(0, 25);

      const rows = items
        .map((it: FeedItem) => {
          const url = it.link?.trim();
          const title = it.title?.trim();
          if (!url || !title) return null;

          return {
            source_id: s.id,
            title,
            url,
            guid: it.guid ?? null,
            published_at: normaliseDate(it),
            summary: it.contentSnippet ?? null,
            author: (it.creator || it.author) ?? null,
            tags: [],
          };
        })
        .filter(Boolean) as any[];

      if (!rows.length) continue;

      const { error: upErr } = await supabase
        .from("items")
        .upsert(rows, { onConflict: "url", ignoreDuplicates: true });

      if (upErr) throw upErr;
      itemsUpserted += rows.length;
    } catch (e: any) {
      errors.push({ source: s.name, error: e?.message ?? String(e) });
    }
  }

  return NextResponse.json({
    ok: true,
    sourcesEnabled: sources?.length ?? 0,
    feedsFetched,
    itemsUpserted,
    errors,
  });
}

