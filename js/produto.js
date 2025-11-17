async function adicionarProduto({ nome, preco = 0, estoque = 0 }) {
  const { data, error } = await window.supabase
    .from('produtos')
    .insert([{ nome, preco, estoque }]);
  if (error) throw error;
  return data;
}

async function listarProdutos() {
  const { data, error } = await window.supabase
    .from('produtos')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  return data;
}

async function atualizarProduto(id, campos) {
  const { data, error } = await window.supabase
    .from('produtos')
    .update(campos)
    .eq('id', id);
  if (error) throw error;
  return data;
}

async function excluirProduto(id) {
  const { data, error } = await window.supabase
    .from('produtos')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return data;
}
