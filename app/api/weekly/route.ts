import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

const CATS: Array<{ key: string; label: string; keywords: string[] }> = [
  {
    key: "deals",
    label: "Deals & Discounts",
    keywords: ["deal", "save", "discount", "sale", "price drop", "bundle", "clearance", "thomann", "andertons", "sweetwater"],
  },
  {
    key: "pedals",
    label: "Pedals & Effects",
    keywords: ["pedal", "overdrive", "distortion", "fuzz", "delay", "reverb", "chorus", "phaser", "flanger", "wah", "multifx", "multi-fx"],
  },
  {
    key: "amps",
    label: "Amps & Modellers",
    keywords: ["amp", "amplifier", "combo", "head", "cab", "kemper", "helix", "fractal", "quad cortex", "tonex", "neural", "modeler", "modeller"],
  },
  {
    key: "guitars",
    label: "Guitars",
    keywords: ["guitar", "strat", "tele", "les paul", "prs", "fender", "gibson", "ibanez", "acoustic"],
  },
  {
    key: "midi",
    label: "MIDI & Control",
    keywords: ["midi", "controller", "footswitch", "foot controller", "expression", "usb midi", "bluetooth midi"],
  },
  {
    key: "mics",
    label: "Mics & Recording",
    keywords: ["mic", "microphone", "interface", "preamp", "recording", "studio", "plugin", "audio interface", "di box"],
  },
  {
    key: "pa",
    label: "Live Sound & PA",
    keywords: ["pa", "speaker", "monitor", "mixer", "wireless", "in-ear", "iem", "front of house", "foh"],
  },
];

function categorise(title: string): string {
  const t = title.toLowerCase();
  for (const c of CATS) {
    if (c.keywords.some((k) => t.includes(k))) return c.key;
  }
  return "other";
}

export async function GET(req: Request) {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, error: "Missing env vars" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const days = Number(searchParams.get("days") ?? "7");
  const limit = Number(searchParams.get("limit") ?? "120");

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: items, error } = await supabase
    .from("items")
    .select("id,title,url,published_at,summary")
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const grouped: Record<string, any[]> = {};
  for (const c of CATS) grouped[c.key] = [];
  grouped.other = [];

  for (const it of items ?? []) {
    const cat = categorise(it.title || "");
    grouped[cat] = grouped[cat] || [];
    grouped[cat].push(it);
  }

  for (const k of Object.keys(grouped)) grouped[k] = grouped[k].slice(0, 10);

  return NextResponse.json({
    ok: true,
    since,
    days,
    counts: Object.fromEntries(Object.entries(grouped).map(([k, v]) => [k, v.length])),
    categories: CATS.map((c) => ({ key: c.key, label: c.label })),
    grouped,
  });
}

