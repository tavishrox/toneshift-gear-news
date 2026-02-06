"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Source = {
  id: string;
  name: string;
  type: string;
  url: string;
};

export default function Home() {
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("sources")
        .select("id,name,type,url,created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) setError(error.message);
      else setSources((data ?? []) as Source[]);
    }

    load();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>ToneShift Gear News</h1>
      <p style={{ marginTop: 8, opacity: 0.75 }}>
        Database connection test (latest sources)
      </p>

      {error ? (
        <p style={{ marginTop: 16, color: "crimson" }}>Error: {error}</p>
      ) : sources.length === 0 ? (
        <p style={{ marginTop: 16 }}>No sources yet (expected).</p>
      ) : (
        <ul style={{ marginTop: 16 }}>
          {sources.map((s) => (
            <li key={s.id} style={{ marginBottom: 10 }}>
              <strong>{s.name}</strong> — {s.type}
              <br />
              <span style={{ opacity: 0.7 }}>{s.url}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

