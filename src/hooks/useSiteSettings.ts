import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache: Record<string, string> = {};
let loaded = false;
let loading: Promise<void> | null = null;

async function loadAll() {
  const { data } = await supabase.from("site_settings").select("key, value");
  if (data) {
    for (const row of data) cache[row.key] = row.value;
  }
  loaded = true;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({ ...cache });
  const [ready, setReady] = useState(loaded);

  useEffect(() => {
    if (loaded) { setSettings({ ...cache }); setReady(true); return; }
    if (!loading) loading = loadAll();
    loading.then(() => { setSettings({ ...cache }); setReady(true); });
  }, []);

  const get = (key: string, fallback: string) => settings[key] ?? fallback;

  return { get, ready, settings };
}

export async function saveSiteSettings(entries: { key: string; value: string }[]) {
  for (const { key, value } of entries) {
    const { data } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
    if (data) {
      await supabase.from("site_settings").update({ value }).eq("id", data.id);
    } else {
      await supabase.from("site_settings").insert({ key, value });
    }
    cache[key] = value;
  }
}
