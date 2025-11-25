// ---------- CLIENTS ----------
async function listarClientes() {
  const { data, error } = await window.supabase
    .from('clientes')      // <-- ajuste para o nome exato da sua tabela
    .select('*')
    .order('idNum', { ascending: true }); // ajuste campo de ordenação se necessário
  if (error) { console.error("listarClientes error:", error); return []; }
  return data;
}

async function adicionarCliente(obj) {
  // obj: { name, id, whatsapp, phone, rua, rua_num, bairro, cidade, referencia, idNum? }
  const { data, error } = await window.supabase
    .from('clientes')
    .insert([obj]);
  if (error) { console.error("adicionarCliente error:", error); throw error; }
  return data;
}

async function atualizarCliente(idNum, changes) {
  const { data, error } = await window.supabase
    .from('clientes')
    .update(changes)
    .eq('idNum', idNum);
  if (error) { console.error("atualizarCliente error:", error); throw error; }
  return data;
}

async function excluirCliente(idNum) {
  const { data, error } = await window.supabase
    .from('clientes')
    .delete()
    .eq('idNum', idNum);
  if (error) { console.error("excluirCliente error:", error); throw error; }
  return data;
}

// ---------- PURCHASES/HISTÓRICO ----------
async function listarCompras(clientIdNum) {
  // se quiser listar só de um cliente, passe clientIdNum, caso contrário deixe undefined
  const q = window.supabase.from('historico'); // <-- ajuste o nome da tabela
  const q2 = clientIdNum ? q.select('*').eq('client_idNum', clientIdNum).order('date', { ascending: false }) : q.select('*').order('date', { ascending: false });
  const { data, error } = await q2;
  if (error) { console.error("listarCompras error:", error); return []; }
  return data;
}

async function adicionarCompra(entry) {
  // entry: { client_idNum, date, produtos: JSON, fee, total, note }
  // OBS: se sua coluna produtos é do tipo JSON/JSONB, envie array/obj normalmente
  const { data, error } = await window.supabase
    .from('historico')
    .insert([entry]);
  if (error) { console.error("adicionarCompra error:", error); throw error; }
  return data;
}

async function excluirCompra(id) {
  const { data, error } = await window.supabase
    .from('historico')
    .delete()
    .eq('id', id);
  if (error) { console.error("excluirCompra error:", error); throw error; }
  return data;
}
