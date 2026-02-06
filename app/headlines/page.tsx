"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Item = {
  id: string;
  title: string;
  url: string;
  published_at: string | null;
  source_id: string | null;
  summary: string | null;
};

type Source = {
  id: string;
  name: string;
};

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function HeadlinesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setError(null);

      const srcRes = await supabase.from("sources").select("id,name").order("name");
      if (srcRes.error) return setError(srcRes.error.message);
      setSources((srcRes.data ?? []) as Source[]);

      let q = supabase
        .from("items")
        .select("id,title,url,published_at,source_id,summary")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(60);

      if (sourceFilter !== "all") q = q.eq("source_id", sourceFilter);

      const itRes = await q;
      if (itRes.error) return setError(itRes.error.message);
      setItems((itRes.data ?? []) as Item[]);
    }

    load();
  }, [sourceFilter]);

  const sourceMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sources) m.set(s.id, s.name);
    return m;
  }, [sources]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 980, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Headlines</h1>
        <Link href="/" style={{ textDecoration: "underline" }}>Home</Link>
      </header>

      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <label style={{ opacity: 0.8 }}>Source:</label>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          style={{ padding: 8 }}
        >
          <option value="all">All</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <a
          href={`/api/import?key=${process.env.NEXT_PUBLIC_IMPORT_KEY}`}
          style={{ marginLeft: "auto", textDecoration: "underline" }}
          target="_blank"
          rel="noreferrer"
        >
          Run import now
        </a>
      </div>

      {error && <p style={{ marginTop: 16, color: "crimson" }}>Error: {error}</p>}

      <div style={{ marginTop: 18 }}>
        {items.length === 0 && !error ? (
          <p>No items yet. Click “Run import now”.</p>
        ) : (
          items.map((it) => (
            <article key={it.id} style={{ padding: "12px 0", borderBottom: "1px solid #eee" }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {fmtDate(it.published_at)}{" "}
                {it.source_id ? `• ${sourceMap.get(it.source_id) ?? "Unknown source"}` : ""}
              </div>
              <a href={it.url} target="_blank" rel="noreferrer" style={{ fontSize: 16, fontWeight: 600 }}>
                {it.title}
              </a>
              {it.summary && (
                <p style={{ marginTop: 6, opacity: 0.85 }}>{it.summary}</p>
              )}
            </article>
          ))
        )}
      </div>
    </main>
  );
}

