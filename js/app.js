/* ========== VARIÁVEIS GLOBAIS ========== */
let clients = [];
let products = [];
let selectedClientId = null;
let editingIndex = null;
const $ = id => document.getElementById(id);

// PAGINAÇÃO - variáveis (declaradas; implementação da paginação ficará a parte)
let currentClientsPage = 1;
const clientsPageSize = 20; // máximo 20 clientes por página
let lastClientsSearchName = "";
let lastClientsSearchId = "";

let currentHistoryPage = 1;
const historyPageSize = 10; // máximo 10 items por página

// printing lock to avoid duplicate prints/inserts
let printingLock = false;

// SUGGESTIONS: storage key and helpers
const S_KEY = "nota_entrega_suggestions_v1";
const S_MAX = 50; // max items per field

function loadSuggestions() {
    try {
        const raw = localStorage.getItem(S_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

function saveSuggestions(obj) {
    try { localStorage.setItem(S_KEY, JSON.stringify(obj)); } catch (e) { }
}

function getFieldList(field) {
    const all = loadSuggestions();
    return Array.isArray(all[field]) ? all[field] : [];
}

function addSuggestion(field, value) {
    if (!field || value === undefined || value === null) return;
    value = String(value).trim();
    if (!value) return;
    const all = loadSuggestions();
    all[field] = all[field] || [];
    // remove duplicate (case-insensitive)
    const idx = all[field].findIndex(x => String(x).toLowerCase() === value.toLowerCase());
    if (idx !== -1) all[field].splice(idx, 1);
    // unshift newest
    all[field].unshift(value);
    // cap length
    if (all[field].length > S_MAX) all[field].length = S_MAX;
    saveSuggestions(all);
    renderDatalist(field); // update UI
}

function renderDatalist(field) {
    const listId = "s_" + field;
    const dl = document.getElementById(listId);
    if (!dl) return;
    const items = getFieldList(field);
    dl.innerHTML = items.map(i => `<option value="${escapeHtmlAttr(i)}">`).join("");
}

/* render all datalists initially */
function renderAllDatalists() {
    const fields = [
        "f_name", "f_id", "f_wh", "f_phone", "f_rua", "f_rua_num", "f_bairro", "f_cidade", "f_ref",
        "prod_desc", "prod_price", "fee", "note", "searchName", "searchId"
    ];
    fields.forEach(renderDatalist);
}

/* helper to escape for option attribute */
function escapeHtmlAttr(s) {
    return String(s).replace(/"/g, "&quot;");
}

/* small escape for inner text display */
function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/* wire up common inputs to save suggestions on blur and Enter */
function attachSuggestionListeners() {
    const fields = [
        "f_name", "f_id", "f_wh", "f_phone", "f_rua", "f_rua_num", "f_bairro", "f_cidade", "f_ref",
        "prod_desc", "prod_price", "fee", "note", "searchName", "searchId"
    ];
    fields.forEach(id => {
        const el = $(id);
        if (!el) return;
        // save on blur
        el.addEventListener("blur", () => addSuggestion(mapField(id), el.value));
        // save on Enter (keydown)
        el.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                addSuggestion(mapField(id), el.value);
                // se for produto, já adiciona
                if (id === "prod_desc") { e.preventDefault(); try { $("addProd").click(); } catch (e) { } }
            }
        });
    });
}

/* normalize mapping of input ids to suggestion keys */
function mapField(inputId) {
    const map = {
        searchName: "searchName",
        searchId: "searchId",
        prod_desc: "prod_desc",
        prod_price: "prod_price",
        fee: "fee",
        note: "note"
    };
    return map[inputId] || inputId;
}

/* ========== persistence of clients ========== */
// agora clients e histórico NÃO são mais salvos em localStorage
function saveClients() {
    // intencionalmente vazio – usamos apenas o Supabase para persistência
}

function now() {
    const d = new Date(), p = n => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function formatDateTime(input) {
    if (!input) return "";
    const d = new Date(input);
    if (isNaN(d)) return String(input); // se não conseguir converter, devolve do jeito que veio
    const p = n => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
/* ensures purchases field exists */
function ensurePurchasesField() {
    let changed = false;
    clients = clients.map(c => {
        if (!Array.isArray(c.purchases)) { c.purchases = []; changed = true; }
        return c;
    });
    if (changed) saveClients();
}

ensurePurchasesField();

// ---------- REMOVIDO: cliente exemplo no localStorage ----------

function newId() {
    const ids = clients.map(c => Number(c.idNum)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    let i = 1; for (const n of ids) { if (n === i) i++; }
    return i;
}

function showInitialScreen() {
    if ($("client-area")) $("client-area").style.display = "block";
    if ($("product-area")) $("product-area").style.display = "none";
    if ($("clientFormCard")) $("clientFormCard").style.display = "none";
    selectedClientId = null;
    if ($("selectedLabel")) $("selectedLabel").innerText = "Nenhum";
}

/* ========== PAGINAÇÃO: função que renderiza a barra de paginação ========== */
function renderClientsPagination(totalPages) {
    const pag = $("clientsPagination");
    if (!pag) return;

    if (totalPages <= 1) {
        pag.innerHTML = "";
        pag.style.display = "none";
        return;
    }

    pag.style.display = "flex";
    pag.style.alignItems = "center";
    pag.style.justifyContent = "center";
    pag.style.gap = "6px";
    pag.style.marginTop = "8px";

    const prevDisabled = currentClientsPage <= 1 ? "disabled" : "";
    const nextDisabled = currentClientsPage >= totalPages ? "disabled" : "";

    pag.innerHTML = `
      <button id="clientsPgPrev" class="ghost small-btn" ${prevDisabled}>&lt;</button>
      <span id="clientsPgInfo" style="font-size:12px;">Página ${currentClientsPage} de ${totalPages}</span>
      <button id="clientsPgNext" class="ghost small-btn" ${nextDisabled}>&gt;</button>
    `;

    const prevBtn = document.getElementById("clientsPgPrev");
    const nextBtn = document.getElementById("clientsPgNext");

    if (prevBtn) prevBtn.onclick = () => {
        if (currentClientsPage > 1) {
            currentClientsPage--;
            renderClients(lastClientsSearchName, lastClientsSearchId);
            const box = $("clientsList");
            if (box) box.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };
    if (nextBtn) nextBtn.onclick = () => {
        if (currentClientsPage < totalPages) {
            currentClientsPage++;
            renderClients(lastClientsSearchName, lastClientsSearchId);
            const box = $("clientsList");
            if (box) box.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };
}

/* ========== LISTAGEM + PAGINAÇÃO DE CLIENTES ========== */
function renderClients(name = "", id = "") {
    const box = $("clientsList");
    if (!box) return;
    box.innerHTML = "";

    lastClientsSearchName = name || "";
    lastClientsSearchId = id || "";

    const searchName = (name || "").toLowerCase().trim();
    const searchId = (id || "").trim();

    // filtra os clientes
    let filtered = clients.filter(c => {
        if (searchName && !String(c.name || "").toLowerCase().includes(searchName)) return false;
        if (searchId && String(c.idNum) !== searchId) return false;
        return true;
    });

    // ordenar do maior para o menor pelo idNum (numérico, fallback 0)
    filtered.sort((a, b) => {
        const na = Number(a.idNum) || 0;
        const nb = Number(b.idNum) || 0;
        return nb - na; // nb - na => decrescente
    });

    // DEBUG opcional
    console.log('renderClients -> filtered:', filtered.length, 'pageSize:', clientsPageSize, 'currentPage:', currentClientsPage);

    // calcula páginas
    const totalPages = Math.max(1, Math.ceil(filtered.length / clientsPageSize) || 1);

    if (currentClientsPage > totalPages) currentClientsPage = totalPages;
    if (currentClientsPage < 1) currentClientsPage = 1;

    const start = (currentClientsPage - 1) * clientsPageSize;
    const end = start + clientsPageSize;
    const pageItems = filtered.slice(start, end);

    // monta a lista da página atual
    pageItems.forEach((c) => {
        const rua = c.rua ? `${c.rua}${c.rua_num ? ", Nº " + c.rua_num : ""}` : "";

        const div = document.createElement("div");
        div.className = "client-card";
        div.innerHTML = `
      <div class="client-info">
        <div class="client-id">${escapeHtml(c.idNum)}</div>
        <div>
          <b>${escapeHtml(c.name)}</b><br>
          <span class="muted">${escapeHtml(c.whatsapp || "")}</span><br>
          <span class="muted" style="font-size:12px">${escapeHtml(rua)}</span>
        </div>
      </div>

      <div style="display:flex; gap:6px;">
        <button class="ghost small-btn" data-a="edit" data-id="${escapeHtmlAttr(String(c.idNum))}">Editar</button>
        <button class="small-btn" data-a="select" data-id="${escapeHtmlAttr(String(c.idNum))}">Selecionar</button>
        <button class="ghost small-btn" data-a="history" data-id="${escapeHtmlAttr(String(c.idNum))}">Histórico</button>
        <button class="ghost small-btn" data-a="del" data-id="${escapeHtmlAttr(String(c.idNum))}">Excluir</button>
      </div>
    `;
        box.appendChild(div);
    });

    if (!pageItems.length) {
        box.innerHTML = '<div class="muted">Nenhum cliente encontrado</div>';
    }

    // chama a renderização da barra de paginação
    renderClientsPagination(totalPages);

    // atualiza datalists de busca (baseados em todos os clients)
    const names = clients.map(c => c.name).filter(Boolean).slice().reverse();
    const dlsn = $("s_searchName"); if (dlsn) dlsn.innerHTML = names.map(n => `<option value="${escapeHtmlAttr(n)}">`).join("");
    const ids = clients.map(c => c.idNum).filter(Boolean).slice().reverse();
    const dlsi = $("s_searchId"); if (dlsi) dlsi.innerHTML = ids.map(n => `<option value="${escapeHtmlAttr(n)}">`).join("");
}

/* delegation for client list buttons */
function clientsListClickHandler(e) {
    const b = e.target.closest("button"); if (!b) return;
    const a = b.dataset.a;
    const idAttr = b.dataset.id;
    const iAttr = b.dataset.i;
    const i = (typeof idAttr !== 'undefined') ? clients.findIndex(c => String(c.idNum).trim() === String(idAttr).trim()) : Number(iAttr);
    const c = clients[i];

    if (!c) return;

    if (a === "select") {
        selectedClientId = String(c.idNum);  // força string pra não perder referência

        if ($("selectedLabel")) $("selectedLabel").innerText = c.name;
        if ($("client-area")) $("client-area").style.display = "none";
        if ($("product-area")) $("product-area").style.display = "block";
        return;
    }

    if (a === "edit") {
        editingIndex = i;

        if ($("client-area")) $("client-area").style.display = "none";
        if ($("product-area")) $("product-area").style.display = "none";
        if ($("clientFormCard")) $("clientFormCard").style.display = "block";

        $("f_name").value = c.name || "";
        $("f_id").value = c.id ?? c.idNum ?? "";
        $("f_wh").value = c.whatsapp || "";
        $("f_phone").value = c.phone || "";
        $("f_rua").value = c.rua || "";
        $("f_rua_num").value = c.rua_num || "";
        $("f_bairro").value = c.bairro || "";
        $("f_cidade").value = c.cidade || "";
        $("f_ref").value = c.referencia || "";

        ["f_name", "f_id", "f_wh", "f_phone", "f_rua", "f_rua_num", "f_bairro", "f_cidade", "f_ref"].forEach(fid => {
            addSuggestion(mapField(fid), $(fid).value);
        });

        try { $("f_name").focus(); $("f_name").select(); } catch (e) { }
        return;
    }

    if (a === "history") {
        openHistory(i);
        return;
    }

    if (a === "del") {
        if (!confirm("Excluir cliente? (o histórico será removido do banco também)")) return;

        const clientIdNum = c.idNum;   // 👈 ADIÇÃO: guardar o idnum do cliente (STRING) - FIX

        // remove da lista em memória e atualiza a tela
        clients.splice(i, 1);

        // ajustar página atual se necessário
        const maxPages = Math.max(1, Math.ceil(clients.length / clientsPageSize) || 1);
        if (currentClientsPage > maxPages) currentClientsPage = maxPages;

        renderClients(lastClientsSearchName, lastClientsSearchId);

        // 👇 APAGA no Supabase
        if (window.supabase) {
            window.supabase
                .from('historico')
                .delete()
                .eq('cliente_indu', Number(clientIdNum)) // ensure numeric match
                .then(({ error }) => {
                    if (error) {
                        console.error("Erro ao apagar histórico do cliente no Supabase:", error);
                    }
                });

            // 2) apaga o próprio cliente
            window.supabase
                .from('clientes')
                .delete()
                .eq('idnum', Number(clientIdNum))
                .then(({ error }) => {
                    if (error) {
                        console.error("Erro ao apagar cliente no Supabase:", error);
                    }
                });
        }

        return;
    }

}

function bindClientsList() {
    const clist = $("clientsList");
    if (clist) clist.onclick = clientsListClickHandler;
}

$("btnNew") && ($("btnNew").onclick = () => {
    editingIndex = null;

    if ($("client-area")) $("client-area").style.display = "none";
    if ($("product-area")) $("product-area").style.display = "none";
    if ($("clientFormCard")) $("clientFormCard").style.display = "block";

    ["f_name", "f_id", "f_wh", "f_phone", "f_rua", "f_rua_num", "f_bairro", "f_cidade", "f_ref"]
        .forEach(id => { if ($(id)) $(id).value = ""; });

    setTimeout(() => { try { $("f_name").focus(); } catch (e) { } }, 40);
});

$("closeForm") && ($("closeForm").onclick = () => {
    showInitialScreen();
});

$("cancelClientNew") && ($("cancelClientNew").onclick = () => {
    selectedClientId = null;
    if ($("selectedLabel")) $("selectedLabel").innerText = "Nenhum";
    products = [];
    renderProducts();
    showInitialScreen();
});

/* ========== SALVAR CLIENTE (AGORA NO SUPABASE) ========== */
$("saveClientNew") && ($("saveClientNew").onclick = async () => {

    const name = $("f_name").value.trim();
    if (!name) return alert("Nome obrigatório");

    const obj = {
        name,
        id: $("f_id").value,
        whatsapp: $("f_wh").value,
        phone: $("f_phone").value,
        rua: $("f_rua").value,
        rua_num: $("f_rua_num").value,
        bairro: $("f_bairro").value,
        cidade: $("f_cidade").value,
        referencia: $("f_ref").value
    };

    ["f_name", "f_wh", "f_phone", "f_rua", "f_rua_num", "f_bairro", "f_cidade", "f_ref"].forEach(fid => {
        addSuggestion(mapField(fid), $(fid).value);
    });

    // EDITAR CLIENTE EXISTENTE
    if (editingIndex !== null && typeof editingIndex !== "undefined") {
        const existing = clients[editingIndex] || { purchases: [], idNum: newId() };
        const updated = {
            ...existing,
            ...obj,
            idNum: existing.idNum,
            purchases: existing.purchases || []
        };

        const { error } = await window.supabase
            .from('clientes')
            .update({
                idnum: Number(updated.idNum) || updated.idNum,
                nome: updated.name,
                whatsapp: updated.whatsapp,
                telefone: updated.phone,
                rua: updated.rua,
                rua_num: updated.rua_num,
                bairro: updated.bairro,
                cidade: updated.cidade,
                referencia: updated.referencia
            })
            .eq('idnum', Number(updated.idNum) || updated.idNum);

        if (error) {
            console.error("Erro ao atualizar cliente no Supabase:", error);
            alert("Erro ao atualizar no banco: " + (error.message || ""));
            return;
        }

        clients[editingIndex] = updated;
        renderClients(lastClientsSearchName, lastClientsSearchId);
        showInitialScreen();
        return;
    }

    // NOVO CLIENTE
    obj.idNum = String(newId()); // store as string internally - FIX
    obj.purchases = [];

    const { data, error } = await window.supabase
        .from('clientes')
        .insert([{
            idnum: Number(obj.idNum), // store numeric in DB
            nome: obj.name,
            whatsapp: obj.whatsapp,
            telefone: obj.phone,
            rua: obj.rua,
            rua_num: obj.rua_num,
            bairro: obj.bairro,
            cidade: obj.cidade,
            referencia: obj.referencia
        }])
        .select();

    if (error) {
        console.error("message:", error.message);
        console.error("details:", error.details);
        console.error("hint:", error.hint);
        console.error("code:", error.code);
        console.error("full:", error);
        alert("Erro ao salvar no banco: " + (error?.message || ""));
        return;
    }

    const row = data && data[0];
    if (row) {
        clients.push({
            ...obj,
            idNum: String(row.idnum ?? obj.idNum) // ensure string - FIX
        });
    } else {
        clients.push(obj);
    }

    renderClients(lastClientsSearchName, lastClientsSearchId);
    showInitialScreen();
});

$("backClient") && ($("backClient").onclick = () => {
    showInitialScreen();
});

$("addProd") && ($("addProd").onclick = () => {
    const desc = $("prod_desc").value.trim();
    let price = parseFloat(String($("prod_price").value || "0").replace(",", "."));
    if (!desc) return alert("Digite o produto");
    if (isNaN(price)) price = 0;
    products.push({ desc, price });
    renderProducts();

    addSuggestion("prod_desc", desc);
    if ($("prod_price").value) addSuggestion("prod_price", $("prod_price").value);

    $("prod_desc").value = "";
    $("prod_price").value = "";
});

function renderProducts() {
    const list = $("prodList");
    if (!list) return;
    if (products.length === 0) {
        list.innerHTML = '<div class="muted">Nenhum produto adicionado</div>';
        return;
    }

    list.innerHTML = products.map((p, i) => {
        const priceNum = Number(p.price) || 0;
        return `
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:6px 0;">
          <span>${escapeHtml(p.desc)}</span>
          <span>
            R$ ${priceNum.toFixed(2).replace(".", ",")}
            <button class="ghost small-btn" onclick="removeProd(${i})">x</button>
          </span>
        </div>
      `;
    }).join("");
}

function removeProd(i) {
    products.splice(i, 1);
    renderProducts();
}

const payBtns = document.querySelectorAll(".pay-btn");

function ativar(btn, texto) {
    payBtns.forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    if ($("note")) $("note").value = texto;
    addSuggestion("note", texto);
}

$("btnPix") && ($("btnPix").onclick = () => ativar($("btnPix"), "PIX"));
$("btnCard") && ($("btnCard").onclick = () => ativar($("btnCard"), "CARTÃO"));
$("btnCash") && ($("btnCash").onclick = () => ativar($("btnCash"), "DINHEIRO"));

/* monta a nota para impressão */
function buildPrint(obj) {
    const { produtos, fee, total, client, note, date } = obj;

    let lista = "";
    if (Array.isArray(produtos) && produtos.length > 0) {
        lista = produtos.map(p => {
            const desc = p.desc || "";
            const price = Number(p.price) || 0;
            const priceText = price.toFixed(2).replace(".", ",");
            return `
        <div style="display:flex; justify-content:space-between; margin-bottom:2px; font-size:12px;">
          <span style="max-width:62mm; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(desc)}</span>
          <span>R$ ${priceText}</span>
        </div>
      `;
        }).join("");
    } else {
        lista = `<div style="font-size:12px;">-- Nenhum produto informado --</div>`;
    }

    const rua = client && client.rua ? `${client.rua}${client.rua_num ? ", Nº " + client.rua_num : ""}` : "";

    const feeNum = Number(fee) || 0;
    const totalNum = Number(total) || 0;
    const feeText = feeNum.toFixed(2).replace(".", ",");
    const totalText = totalNum.toFixed(2).replace(".", ",");

    return `
    
   <div class="no-break" style="
    width:80mm;
    padding:10px 16px;
    font-size:19px;
    font-family: Arial, Helvetica, sans-serif;
">


      <div style="text-align:center; font-weight:700; margin-bottom:18px; font-size:20px;">NOTA DE ENTREGA</div>

      <div style="margin:4px 0;">Data: ${escapeHtml(date || "")}</div>
      <div style="margin:4px 0;">Venda: ${escapeHtml(obj.venda || "")}</div>

      <div style="border-top:1px dashed #000;margin:6px 0"></div>

      <b>Produtos:</b>
      ${lista}
      <div style="border-top:1px dashed #000;margin:6px 0"></div>

      Entrega: R$ ${feeText}
      <div><b>Total: R$ ${totalText}</b></div>

      <div style="border-top:1px dashed #000;margin:6px 0"></div>

     <b style="font-size:12px;">Cliente:</b>
<div style="margin:2px 0; font-size:11px;"><b>Nome:</b> ${escapeHtml(client?.name || "")}</div>
<div style="margin:2px 0; font-size:11px;"><b>Rua:</b> ${escapeHtml(rua)}</div>
<div style="margin:2px 0; font-size:11px;"><b>Bairro:</b> ${escapeHtml(client?.bairro || "")}</div>
<div style="margin:2px 0; font-size:11px;"><b>Cidade:</b> ${escapeHtml(client?.cidade || "")}</div>
<div style="margin:2px 0; font-size:11px;"><b>Whats:</b> ${escapeHtml(client?.whatsapp || "")}</div>
<div style="margin:2px 0; font-size:11px;"><b>Tel:</b> ${escapeHtml(client?.phone || "")}</div>


      <div style="border-top:1px dashed #000;margin:6px 0"></div>

      ${client && client.referencia ? `<div style="margin:2px 0;"><strong>Referência:</strong> ${escapeHtml(client.referencia)}</div><div style="border-top:1px dashed #000;margin:6px 0"></div>` : ""}

      <div style="margin:4px 0;"><strong>Obs:</strong> ${escapeHtml(note || "")}</div>

      <div style="margin:8px 0;"></div>

      <div style="margin:4px 0;">Assinatura do Cliente:</div>
      <div style="margin:2px 0;">______________________________</div>

      <div style="margin-top:6px;"></div>
      <div style="text-align:center; margin-top:4px;">Obrigado pela preferência!</div>

    </div>
  `;
}

/* salvar compra no histórico (Supabase + memória)
   Versão com logs, aguarda o insert e atualiza memória quando possível.
*/
async function savePurchaseToClient(clientIdNum, purchaseData) {

    // Agora NÃO bloqueia o salvamento — trava só durante a operação
    printingLock = true;

    try {
        const purchase = {
            id: Date.now(),
            clientIdNum,
            date: purchaseData.date || now(),
            produtos: Array.isArray(purchaseData.produtos) ? purchaseData.produtos : [],
            fee: Number(purchaseData.fee || 0),
            total: Number(purchaseData.total || 0),
            note: purchaseData.note || ""
        };

        // encontra o cliente em memória (normalize compare) - FIX
        const idx = clients.findIndex(c =>
            String(c.idNum).trim() === String(clientIdNum).trim() ||
            String(c.idnum || "").trim() === String(clientIdNum).trim() ||
            String(c.id || "").trim() === String(clientIdNum).trim()
        );

        if (idx !== -1) {
            if (!Array.isArray(clients[idx].purchases))
                clients[idx].purchases = [];
            clients[idx].purchases.push(purchase);
        }

        const payload = {
            cliente_indu: (clientIdNum !== null && clientIdNum !== undefined && String(clientIdNum).trim() !== "") ? Number(String(clientIdNum).trim()) : null,
            produto: JSON.stringify(purchase.produtos),
            taxaentrega: purchase.fee,
            total: purchase.total,
            obs: purchase.note
        };

        const res = await window.supabase
            .from('historico')
            .insert([payload])
            .select();

        if (res?.error) {
            console.error("Erro ao inserir histórico:", res.error);
        }

        // Atualiza o ID salvo no Supabase
        const row = res?.data?.[0];
        if (row && idx !== -1) {
            const pidx = clients[idx].purchases.findIndex(p => p.id === purchase.id);
            if (pidx !== -1)
                clients[idx].purchases[pidx].id = row.id;
        }

        return row ? { ...purchase, id: row.id } : purchase;

    } catch (err) {
        console.error("savePurchaseToClient error:", err);
        return null;
    } finally {
        printingLock = false; // destrava sempre
    }
}

/* carrega histórico do Supabase e coloca em clients[i].purchases */
async function loadHistoryIntoClients() {
  try {
    const { data, error } = await window.supabase
      .from('historico')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error("Erro ao buscar histórico no Supabase:", error);
      return;
    }

    // limpa purchases antes
    clients.forEach(c => { c.purchases = []; });

    if (!Array.isArray(data) || data.length === 0) {
      console.log("Nenhum registro de histórico retornado do Supabase.");
      return;
    }

    const unmatched = [];

    data.forEach(row => {
      // pega valor cru do histórico (prioriza cliente_indu)
      const rawCliente = row.cliente_indu ?? row.client_id ?? row.cliente ?? null;

      // normalizações para comparação
      const rowStr = rawCliente !== null && rawCliente !== undefined ? String(rawCliente).trim() : null;
      const rowNum = (rawCliente !== null && rawCliente !== undefined && !isNaN(Number(rawCliente))) ? Number(rawCliente) : null;

      if (rowStr === null) {
        unmatched.push({ row, reason: 'cliente_indu ausente' });
        return;
      }

      // busca cliente tolerante a tipos/formato
      const clientIndex = clients.findIndex(c => {
        const candRaw = c.idNum ?? c.idnum ?? c.id ?? "";
        const candStr = candRaw !== null && candRaw !== undefined ? String(candRaw).trim() : "";
        const candNum = (!isNaN(Number(candRaw)) && candStr !== "") ? Number(candRaw) : null;

        // 1) exact string
        if (candStr && rowStr === candStr) return true;
        // 2) exact numeric
        if (rowNum !== null && candNum !== null && rowNum === candNum) return true;
        // 3) fuzzy contains (prefix/suffix issues)
        if (candStr && candStr.includes(rowStr)) return true;
        if (rowStr && rowStr.includes(candStr) && candStr !== "") return true;
        // 4) compare digits only (remove formatação)
        const digitsRow = rowStr.replace(/\D+/g, '');
        const digitsCand = candStr.replace(/\D+/g, '');
        if (digitsRow && digitsCand && digitsRow === digitsCand) return true;

        return false;
      });

      if (clientIndex === -1) {
        unmatched.push({ row, reason: 'não encontrou cliente correspondente' });
        return;
      }

      const client = clients[clientIndex];
      if (!Array.isArray(client.purchases)) client.purchases = [];

      // parse produto com segurança
      let produtos = [];
      if (row.produto) {
        try { produtos = JSON.parse(row.produto); } catch (e) { produtos = []; }
      }

      client.purchases.push({
        id: row.id,
        clientIdNum: rawCliente,
        date: formatDateTime(row.created_at) || String(row.created_at || row.date || ""),
        produtos,
        fee: row.taxaentrega ?? row.fee ?? 0,
        total: row.total ?? 0,
        note: row.obs ?? row.note ?? ""
      });
    });

    const withPurchases = clients.filter(c => (c.purchases || []).length > 0)
      .map(c => ({ idNum: c.idNum, name: c.name, purchases: c.purchases.length }));

    console.log("Histórico carregado. Clientes com purchases:", withPurchases);

    if (unmatched.length) {
      console.warn("Registros não associados (exemplo):", unmatched.slice(0, 20));
    } else {
      console.log("Todas as linhas foram associadas.");
    }

  } catch (e) {
    console.error("Exceção ao carregar histórico do Supabase:", e);
  }
}


/* botão imprimir / registrar compra */
$("printBtn").onclick = async () => {

    // NÃO usa printingLock aqui — só dentro do savePurchaseToClient

    const client = clients.find(c =>
        String(c.idNum) === String(selectedClientId)
    );

    if (!client) {
        alert("Selecione um cliente antes de registrar a venda.");
        return;
    }


    const soma = products.reduce((s, p) => s + (Number(p.price) || 0), 0);
    let fee = parseFloat(String($("fee").value || "0").replace(",", "."));
    if (isNaN(fee)) fee = 0;

    const total = soma + fee;

    if ($("fee").value) addSuggestion("fee", $("fee").value);
    if ($("note").value) addSuggestion("note", $("note").value);

    // 🔥 Agora apenas salva, SEM travar aqui
    const saved = await savePurchaseToClient(client.idNum, {
        produtos: products,
        fee,
        total,
        note: $("note").value,
        date: now()
    });

    // monta a área de impressão
    const pa = $("print-area");
    if (pa) pa.innerHTML = "";

    pa.innerHTML = buildPrint({
        date: now(),
        produtos: products,
        fee,
        total,
        client,
        note: $("note") ? $("note").value : "",
        venda: saved ? saved.id : ""
    });

    // limpeza pós impressão
    const cleanUpAfterPrint = () => {
        try {
            if (pa) pa.innerHTML = "";
            showInitialScreen();
            products = [];
            renderProducts();
        } finally {
            window.removeEventListener("afterprint", cleanUpAfterPrint);
        }
    };

    window.addEventListener("afterprint", cleanUpAfterPrint);

    try {
        window.print();
    } catch (err) {
        console.error("Erro ao chamar window.print:", err);
        cleanUpAfterPrint();
    }
};


/* HISTÓRICO: abrir modal */
function openHistory(index) {
    const client = clients[index];
    const out = $("historyContent");
    if (!out) return;
    out.innerHTML = "";

    if (!client.purchases || client.purchases.length === 0) {
        out.innerHTML = "<div class='muted'>Nenhum registro de compra</div>";
    } else {
        client.purchases.forEach((p, pi) => {
            const div = document.createElement("div");
            div.className = "hist-item";
            const itens = (p.produtos && p.produtos.length)
                ? p.produtos.map(it => `${escapeHtml(it.desc)} — R$ ${Number(it.price || 0).toFixed(2).replace(".", ",")}`).join("<br>")
                : "--";
            div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <b>${escapeHtml(p.date)}</b><br>
            ${itens}<br>
            Entrega: R$ ${Number(p.fee || 0).toFixed(2).replace(".", ",")}<br>
            <b>Total: R$ ${Number(p.total || 0).toFixed(2).replace(".", ",")}</b><br>
            Obs: ${escapeHtml(p.note || "")}
          </div>
          <div style="margin-left:12px; text-align:right;">
            <button class="ghost small-btn" data-action="view" data-client="${client.idNum}" data-pid="${p.id}">Imprimir</button>
            <button class="ghost small-btn" data-action="del" data-client="${client.idNum}" data-pid="${p.id}">Excluir</button>
          </div>
        </div>
      `;
            out.appendChild(div);
        });
    }

    out.dataset.index = index;
    if ($("historyModal")) $("historyModal").style.display = "flex";
}

/* ações dentro do modal (delegation) */
$("historyContent") && ($("historyContent").onclick = function (e) {
    const b = e.target.closest("button"); if (!b) return;
    const action = b.dataset.action;
    const clientId = String(b.dataset.client);
    const pid = Number(b.dataset.pid);

    const cidx = clients.findIndex(c => String(c.idNum) === String(clientId));
    if (cidx === -1) return alert("Cliente não encontrado");

    if (action === "del") {
        if (!confirm("Excluir este registro do histórico?")) return;

        // APAGA DO SUPABASE
        window.supabase
            .from('historico')
            .delete()
            .eq('id', pid)
            .then(({ error }) => {
                if (error) {
                    console.error("Erro ao apagar histórico no Supabase:", error);
                    alert("Erro ao apagar no banco.");
                    return;
                }

                // APAGA NA MEMÓRIA
                const arr = clients[cidx].purchases || [];
                clients[cidx].purchases = arr.filter(x => x.id !== pid);

                // RECARREGA O MODAL
                openHistory(cidx);
            });

        return;
    }


    if (action === "view") {
        // se já estiver imprimindo, bloqueia nova impressão
        if (printingLock) {
            return alert("Operação em andamento. Aguarde.");
        }

        const entry = (clients[cidx].purchases || []).find(x => x.id === pid);
        if (!entry) return alert("Registro não encontrado");

        const fakeClient = clients[cidx];

        // limpa e monta print-area explicitamente para evitar multiplicação
        const pa = $("print-area");
        if (pa) pa.innerHTML = "";

        pa.innerHTML = buildPrint({
            date: entry.date,
            produtos: entry.produtos || [],
            fee: entry.fee || 0,
            total: entry.total || 0,
            client: fakeClient,
            note: entry.note || "",
            venda: entry.id
        });

        // trava para evitar duplicação
        printingLock = true;

        const afterPrintCleanup = () => {
            try {
                if (pa) pa.innerHTML = "";
                // volta tela inicial (mantém cliente desmarcado)
                selectedClientId = null;
                if ($("selectedLabel")) $("selectedLabel").innerText = "Nenhum";
                showInitialScreen();
            } finally {
                printingLock = false;
                window.removeEventListener('afterprint', afterPrintCleanup);
            }
        };

        window.addEventListener('afterprint', afterPrintCleanup);

        try {
            window.print();
        } catch (err) {
            console.error("Erro ao imprimir histórico:", err);
            afterPrintCleanup();
        }

        return;
    }
});

$("closeHistory") && ($("closeHistory").onclick = () => { if ($("historyModal")) $("historyModal").style.display = "none"; });
document.getElementById("historyModal") && (document.getElementById("historyModal").onclick = (e) => { if (e.target.id === "historyModal") $("historyModal").style.display = "none"; });

/* Ajuste: buscas devem resetar a paginação para 1 */
$("searchName") && ($("searchName").oninput = () => { currentClientsPage = 1; renderClients($("searchName").value, $("searchId").value); });
$("searchId") && ($("searchId").oninput = () => { currentClientsPage = 1; renderClients($("searchName").value, $("searchId").value); });

/* DOM ready wrapper */
function domReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(fn, 1);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

/* initial render and attach listeners for suggestions */
domReady(() => {
    (async () => {
        try {
            const { data, error } = await window.supabase
                .from('clientes')
                .select('*')
                .order('id', { ascending: true });

            if (!error && Array.isArray(data)) {
                clients = data.map(c => {
                    // normalize idNum to STRING to avoid type mismatch when matching with historico.cliente_indu - FIX
                    const rawIdNum = c.idnum ?? c.idNum ?? c.id ?? "";
                    return {
                        id: c.id || c.euia || c.id,
                        idNum: rawIdNum !== null && rawIdNum !== undefined ? String(rawIdNum).trim() : "",
                        name: c.nome || c.name || c.nome,
                        whatsapp: c.whatsapp || c.WhatsApp,
                        rua: c.rua,
                        rua_num: c.rua_num,
                        bairro: c.bairro,
                        cidade: c.cidade,
                        referencia: c.referencia,
                        purchases: []
                    };
                });
            }

            await loadHistoryIntoClients();

        } catch (e) {
            console.error('Erro ao buscar clientes do Supabase', e);
        } finally {
            renderClients();
            renderProducts();
            renderAllDatalists();
            attachSuggestionListeners();
            bindClientsList();
            // bind pagination not needed because renderClientsPagination wires its own events
        }
    })();
});
