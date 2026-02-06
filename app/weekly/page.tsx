"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type WeeklyData = {
  ok: boolean;
  since: string;
  days: number;
  categories: { key: string; label: string }[];
  grouped: Record<
    string,
    { title: string; url: string; published_at: string | null; summary: string | null }[]
  >;
};

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function WeeklyPage() {
  const [data, setData] = useState<WeeklyData | null>(null);
  const [days, setDays] = useState(7);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setData(null);
    const res = await fetch(`/api/weekly?days=${days}`);
    const json = await res.json();
    if (!json.ok) setError(json.error || "Failed");
    else setData(json);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const digestText = useMemo(() => {
    if (!data) return "";
    const lines: string[] = [];

    lines.push(`ToneShift Weekly Gear News — last ${data.days} days`);
    lines.push(`Since: ${new Date(data.since).toLocaleDateString("en-GB")}`);
    lines.push("");

    for (const c of data.categories) {
      const items = data.grouped[c.key] || [];
      if (!items.length) continue;

      lines.push(c.label);
      for (const it of items) {
        lines.push(`- ${it.title}`);
        lines.push(`  ${it.url}`);
      }
      lines.push("");
    }

    const other = data.grouped.other || [];
    if (other.length) {
      lines.push("Other");
      for (const it of other) {
        lines.push(`- ${it.title}`);
        lines.push(`  ${it.url}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }, [data]);

  async function copyDigest() {
    await navigator.clipboard.writeText(digestText);
    alert("Copied digest to clipboard");
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 980, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Weekly Digest</h1>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/headlines" style={{ textDecoration: "underline" }}>Headlines</Link>
          <Link href="/" style={{ textDecoration: "underline" }}>Home</Link>
        </div>
      </header>

      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <label style={{ opacity: 0.8 }}>Days:</label>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ padding: 8 }}>
          <option value={7}>7</option>
          <option value={10}>10</option>
          <option value={14}>14</option>
        </select>

        <button onClick={load} style={{ padding: "8px 12px", cursor: "pointer" }}>
          Refresh
        </button>

        <button
          onClick={copyDigest}
          disabled={!digestText}
          style={{ padding: "8px 12px", cursor: "pointer", marginLeft: "auto" }}
        >
          Copy digest
        </button>
      </div>

      {error && <p style={{ marginTop: 16, color: "crimson" }}>Error: {error}</p>}
      {!data && !error && <p style={{ marginTop: 16 }}>Loading…</p>}

      {data && (
        <div style={{ marginTop: 18 }}>
          {data.categories.map((c) => {
            const items = data.grouped[c.key] || [];
            if (!items.length) return null;
            return (
              <section key={c.key} style={{ marginBottom: 18 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>{c.label}</h2>
                <ul>
                  {items.map((it, idx) => (
                    <li key={idx} style={{ marginBottom: 10 }}>
                      <a href={it.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                        {it.title}
                      </a>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{fmtDate(it.published_at)}</div>
                      {it.summary && <div style={{ opacity: 0.85 }}>{it.summary}</div>}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          <hr style={{ margin: "24px 0" }} />
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Copy-ready text</h2>
          <textarea
            value={digestText}
            readOnly
            style={{ width: "100%", minHeight: 240, padding: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          />
        </div>
      )}
    </main>
  );
}

