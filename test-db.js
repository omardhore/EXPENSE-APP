import { createClient } from "@supabase/supabase-js"; 
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY); 
s.from("categories").select("*").then(r => console.log(r));