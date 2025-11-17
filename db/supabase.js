// NOTA/db/supabase.js

const SUPABASE_URL = "https://acwgukyvgnaklmccrzsj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjd2d1a3l2Z25ha2xtY2NyenNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMzU4MTQsImV4cCI6MjA3ODkxMTgxNH0.fKwcH0HTAZPysSxRkOfIQQXWpVzoFDEtvq8Da890Z8Q";

// cria o cliente do Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// deixa global para todo o sistema
window.supabase = supabaseClient;
