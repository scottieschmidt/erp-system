import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabaseBrowser } from "#/lib/supabaseBrowser";

export const Route = createFileRoute("/erp/register4")({
  component: SupabaseTestPage,
});

function SupabaseTestPage() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const runInsert = async () => {
    setLoading(true);
    setResult("");

    try {
      if (!supabaseBrowser) throw new Error("Supabase not configured");

      const { data, error } = await supabaseBrowser
        .from("test")
        .insert([{}]) // uses default values
        .select("*")
        .single();

      if (error) throw error;

      setResult(`Inserted row: ${JSON.stringify(data, null, 2)}`);
      console.log("Inserted row:", data);
    } catch (err: any) {
      setResult(`Error: ${err?.message ?? String(err)}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Supabase Insert Test</h1>
      <button onClick={runInsert} disabled={loading}>
        {loading ? "Inserting..." : "Insert into test table"}
      </button>
      <pre style={{ marginTop: 16 }}>{result}</pre>
    </main>
  );
}