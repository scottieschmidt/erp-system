import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

async function testInsert() {
  const { data, error } = await supabase
    .from("test")
    .insert([{ id: 1 }]);

  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Success:", data);
  }
}

testInsert();