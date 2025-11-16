/* ========== VARIÁVEIS GLOBAIS ========== */
let clients = JSON.parse(localStorage.getItem("nota_entrega_clients_v1") || "[]");
let products = [];
let selectedClientId = null;
let editingIndex = null;
const $ = id => document.getElementById(id);

// SUGESTIONS: storage key and helpers
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
                // if product desc and on product area, prevent form submit and add product
                if (id === "prod_desc") { e.preventDefault(); try { $("addProd").click(); } catch (e) { } }
            }
        });
    });
}

/* normalize mapping of input ids to suggestion keys */
function mapField(inputId) {
    // uses same names as datalist ids without the s_
    // map prod inputs to prod_*
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

/* ========== persistence of clients (unchanged) ========== */
function saveClients() {
    localStorage.setItem("nota_entrega_clients_v1", JSON.stringify(clients));
}

function now() {
    const d = new Date(), p = n => String(n).padStart(2, "0");
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

if (clients.length === 0) {
    clients = [{
        idNum: 1,
        name: "Aline Alves",
        whatsapp: "48 98403-6299",
        rua: "Av. Caetano Silveira",
        rua_num: "901",
        bairro: "Brejaru",
        cidade: "Palhoça",
        purchases: []
    }];
    saveClients();
}

function newId() {
    const ids = clients.map(c => c.idNum).sort((a, b) => a - b);
    let i = 1; for (const n of ids) { if (n === i) i++; }
    return i;
}

function showInitialScreen() {
    // mostra a lista inicial
    $("client-area").style.display = "block";
    $("product-area").style.display = "none";
    $("clientFormCard").style.display = "none";
    selectedClientId = null;
    $("selectedLabel").innerText = "Nenhum";
}

function renderClients(name = "", id = "") {
    const box = $("clientsList");
    box.innerHTML = "";

    name = name.toLowerCase();

    clients.forEach((c, i) => {
        if (name && !c.name.toLowerCase().includes(name)) return;
        if (id && String(c.idNum) !== id) return;

        const rua = c.rua ? `${c.rua}${c.rua_num ? ", Nº " + c.rua_num : ""}` : "";

        const div = document.createElement("div");
        div.className = "client-card";
        div.innerHTML = `
      <div class="client-info">
        <div class="client-id">${c.idNum}</div>
        <div>
          <b>${c.name}</b><br>
          <span class="muted">${c.whatsapp || ""}</span><br>
          <span class="muted" style="font-size:12px">${rua}</span>
        </div>
      </div>

      <div style="display:flex; gap:6px;">
        <button class="ghost small-btn" data-a="edit" data-i="${i}">Editar</button>
        <button class="small-btn" data-a="select" data-i="${i}">Selecionar</button>
        <button class="ghost small-btn" data-a="history" data-i="${i}">Histórico</button>
        <button class="ghost small-btn" data-a="del" data-i="${i}">Excluir</button>
      </div>
    `;
        box.appendChild(div);
    });

    if (!box.innerHTML)
        box.innerHTML = '<div class="muted">Nenhum cliente encontrado</div>';

    // also populate searchName suggestion list with client names
    // (store recent searches separately via addSuggestion when user types)
    // but we refresh s_searchName with current client names as convenience:
    const names = clients.map(c => c.name).filter(Boolean).slice().reverse();
    const dlsn = $("s_searchName"); if (dlsn) dlsn.innerHTML = names.map(n => `<option value="${escapeHtmlAttr(n)}">`).join("");
    const ids = clients.map(c => c.idNum).filter(Boolean).slice().reverse();
    const dlsi = $("s_searchId"); if (dlsi) dlsi.innerHTML = ids.map(n => `<option value="${escapeHtmlAttr(n)}">`).join("");
}

$("clientsList").onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    const a = b.dataset.a;
    const i = Number(b.dataset.i);
    const c = clients[i];

    if (a === "select") {
        selectedClientId = c.idNum;
        $("selectedLabel").innerText = c.name;
        $("client-area").style.display = "none";
        $("product-area").style.display = "block";
        return;
    }

    if (a === "edit") {
        editingIndex = i;

        // Fecha telas anteriores (pula de tela)
        $("client-area").style.display = "none";
        $("product-area").style.display = "none";

        // Abre somente o formulário de edição
        $("clientFormCard").style.display = "block";

        // Preenche os campos
        $("f_name").value = c.name;
        $("f_id").value = c.id;
        $("f_wh").value = c.whatsapp;
        $("f_phone").value = c.phone;
        $("f_rua").value = c.rua;
        $("f_rua_num").value = c.rua_num;
        $("f_bairro").value = c.bairro;
        $("f_cidade").value = c.cidade;
        $("f_ref").value = c.referencia;

        // save those values to suggestions (so they appear later)
        ["f_name", "f_id", "f_wh", "f_phone", "f_rua", "f_rua_num", "f_bairro", "f_cidade", "f_ref"].forEach(fid => {
            addSuggestion(mapField(fid), $(fid).value);
        });

        try { $("f_name").focus(); $("f_name").select(); } catch (e) { }
        return;
    }

    if (a === "history") {
        openHistory(i);
    }

    if (a === "del") {
        if (confirm("Excluir cliente? (o histórico será removido junto)")) {
            clients.splice(i, 1);
            saveClients(); renderClients();
        }
    }
};

$("btnNew").onclick = () => {
    editingIndex = null;

    // Fecha outras telas e abre só o formulário (pula de tela)
    $("client-area").style.display = "none";
    $("product-area").style.display = "none";
    $("clientFormCard").style.display = "block";

    ["f_name", "f_id", "f_wh", "f_phone", "f_rua", "f_rua_num", "f_bairro", "f_cidade", "f_ref"]
        .forEach(id => $(id).value = "");

    // foca no nome
    setTimeout(() => { try { $("f_name").focus(); } catch (e) { } }, 40);
};

$("closeForm").onclick = () => {
    // apenas fecha o formulário e volta para lista inicial
    showInitialScreen();
};

$("cancelClientNew").onclick = () => {
    // fecha o formulário e volta para lista inicial
    showInitialScreen();
};

$("saveClientNew").onclick = () => {

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

    // save suggestions for each field user entered
    ["f_name", "f_id", "f_wh", "f_phone", "f_rua", "f_rua_num", "f_bairro", "f_cidade", "f_ref"].forEach(fid => {
        addSuggestion(mapField(fid), $(fid).value);
    });

    if (editingIndex !== null) {
        // editar cliente existente: mantém purchases existentes se houver
        const existing = clients[editingIndex] || { purchases: [] };
        clients[editingIndex] = { ...existing, ...obj, purchases: existing.purchases || [] };
        saveClients(); renderClients();

        // volta para tela inicial (lista)
        showInitialScreen();
        return;
    }

    // novo cliente
    obj.idNum = newId();
    obj.purchases = [];
    clients.push(obj);
    saveClients(); renderClients();

    // volta para tela inicial (lista) após criar
    showInitialScreen();
};

$("backClient").onclick = () => {
    // quando clicar voltar na tela de produtos, volta para lista
    showInitialScreen();
};

$("addProd").onclick = () => {
    const desc = $("prod_desc").value.trim();
    let price = parseFloat(String($("prod_price").value || "0").replace(",", "."));
    if (!desc) return alert("Digite o produto");
    if (isNaN(price)) price = 0;
    products.push({ desc, price });
    renderProducts();

    // save suggestions for product and price
    addSuggestion("prod_desc", desc);
    if ($("prod_price").value) addSuggestion("prod_price", $("prod_price").value);

    $("prod_desc").value = "";
    $("prod_price").value = "";
};

function renderProducts() {
    const list = $("prodList");
    if (products.length === 0) {
        list.innerHTML = '<div class="muted">Nenhum produto adicionado</div>';
        return;
    }

    list.innerHTML = products.map((p, i) => `
    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:6px 0;">
      <span>${escapeHtml(p.desc)}</span>
      <span>
        R$ ${p.price.toFixed(2).replace(".", ",")}
        <button class="ghost small-btn" onclick="removeProd(${i})">x</button>
      </span>
    </div>
  `).join("");
}
function removeProd(i) {
    products.splice(i, 1);
    renderProducts();
}

const payBtns = document.querySelectorAll(".pay-btn");

function ativar(btn, texto) {
    payBtns.forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    $("note").value = texto;
    addSuggestion("note", texto); // save note suggestion when activated
}

$("btnPix").onclick = () => ativar($("btnPix"), "PIX");
$("btnCard").onclick = () => ativar($("btnCard"), "CARTÃO");
$("btnCash").onclick = () => ativar($("btnCash"), "DINHEIRO");

/* monta a nota para impressão (fonte 12px, espaçamento simples) */
function buildPrint(obj) {
    const { produtos, fee, total, client, note, date } = obj;

    let lista = "";
    if (Array.isArray(produtos) && produtos.length > 0) {
        lista = produtos.map(p => {
            const desc = p.desc || "";
            const price = typeof p.price === "number" ? p.price : parseFloat(String(p.price || "0").replace(",", "."));
            const priceText = isNaN(price) ? "0,00" : price.toFixed(2).replace(".", ",");
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

    const feeNum = typeof fee === "number" ? fee : parseFloat(String(fee || "0").replace(",", ".")) || 0;
    const totalNum = typeof total === "number" ? total : parseFloat(String(total || "0").replace(",", ".")) || 0;
    const feeText = isNaN(feeNum) ? "0,00" : feeNum.toFixed(2).replace(".", ",");
    const totalText = isNaN(totalNum) ? "0,00" : totalNum.toFixed(2).replace(".", ",");

    return `
    <div class="no-break" style="width:80mm;font-family:monospace;padding:3px; white-space:normal; font-size:12px; line-height:1;">

      <div style="text-align:center; font-weight:700; margin-bottom:4px; font-size:12px;">NOTA DE ENTREGA</div>

      <div style="margin:4px 0;">Data: ${escapeHtml(date || "")}</div>
      <div style="margin:4px 0;">Venda: ${escapeHtml(obj.venda || "")}</div>

      <div style="border-top:1px dashed #000;margin:6px 0"></div>

      <b>Produtos:</b>
      ${lista}
      <div style="border-top:1px dashed #000;margin:6px 0"></div>

      Entrega: R$ ${feeText}
      <div><b>Total: R$ ${totalText}</b></div>

      <div style="border-top:1px dashed #000;margin:6px 0"></div>

      <b>Cliente:</b>
      <div style="margin:2px 0;">${escapeHtml(client && client.name ? client.name : "")}</div>
      <div style="margin:2px 0;">Rua: ${escapeHtml(rua)}</div>
      <div style="margin:2px 0;">Bairro: ${escapeHtml(client && client.bairro ? client.bairro : "")}</div>
      <div style="margin:2px 0;">Cidade: ${escapeHtml(client && client.cidade ? client.cidade : "")}</div>
      <div style="margin:2px 0;">Whats: ${escapeHtml(client && client.whatsapp ? client.whatsapp : "")}</div>
      <div style="margin:2px 0;">Tel: ${escapeHtml(client && client.phone ? client.phone : "")}</div>

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

/* save purchase to client history */
function savePurchaseToClient(clientId, { produtos, fee, total, note, date }) {
    const idx = clients.findIndex(c => c.idNum === clientId);
    if (idx === -1) return null;
    const entry = {
        id: Date.now(),
        date,
        produtos: (produtos || []).map(p => ({ desc: p.desc, price: p.price })),
        fee,
        total,
        note
    };
    clients[idx].purchases = clients[idx].purchases || [];
    clients[idx].purchases.unshift(entry);
    saveClients();
    return entry;
}

$("printBtn").onclick = () => {

    const client = clients.find(c => c.idNum === selectedClientId);
    if (!client) return alert("Selecione um cliente");

    const soma = products.reduce((s, p) => s + (typeof p.price === "number" ? p.price : parseFloat(String(p.price).replace(",", ".")) || 0), 0);
    let fee = parseFloat(String($("fee").value || "0").replace(",", "."));
    if (isNaN(fee)) fee = 0;

    const total = soma + fee;

    // save suggestion for fee and note
    if ($("fee").value) addSuggestion("fee", $("fee").value);
    if ($("note").value) addSuggestion("note", $("note").value);

    // salva no histórico (snapshot) ANTES de imprimir
    const saved = savePurchaseToClient(client.idNum, {
        produtos: products,
        fee,
        total,
        note: $("note").value,
        date: now()
    });

    // popula área de impressão (passando a venda como id do saved)
    $("print-area").innerHTML = buildPrint({
        date: now(),
        produtos: products,
        fee, total,
        client,
        note: $("note").value,
        venda: saved ? saved.id : ""
    });

    // força render antes de chamar print
    requestAnimationFrame(() => {
        window.print();
        // limpa após curto período
        setTimeout(() => {
            $("print-area").innerHTML = "";
            // depois de finalizar a impressão, volta para a tela inicial
            showInitialScreen();
        }, 700);
    });

    // limpa produtos e seleção depois de salvar/imprimir
    products = [];
    renderProducts();
};

/* HISTÓRICO: abrir modal */
function openHistory(index) {
    const client = clients[index];
    const out = $("historyContent");
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

    // guarda index para ações
    out.dataset.index = index;
    $("historyModal").style.display = "flex";
}

/* ações dentro do modal (delegation) */
$("historyContent").onclick = function (e) {
    const b = e.target.closest("button"); if (!b) return;
    const action = b.dataset.action;
    const clientId = Number(b.dataset.client);
    const pid = Number(b.dataset.pid);

    const cidx = clients.findIndex(c => c.idNum === clientId);
    if (cidx === -1) return alert("Cliente não encontrado");

    if (action === "del") {
        if (!confirm("Excluir este registro do histórico?")) return;
        const arr = clients[cidx].purchases || [];
        const newArr = arr.filter(x => x.id !== pid);
        clients[cidx].purchases = newArr;
        saveClients();
        // re-open modal to refresh
        openHistory(cidx);
        return;
    }

    if (action === "view") {
        // imprimir somente essa nota do histórico
        const entry = (clients[cidx].purchases || []).find(x => x.id === pid);
        if (!entry) return alert("Registro não encontrado");

        // montar print com os dados do entry
        const fakeClient = clients[cidx];
        $("print-area").innerHTML = buildPrint({
            date: entry.date,
            produtos: entry.produtos || [],
            fee: entry.fee || 0,
            total: entry.total || 0,
            client: fakeClient,
            note: entry.note || "",
            venda: entry.id
        });

        requestAnimationFrame(() => {
            window.print();
            setTimeout(() => {
                $("print-area").innerHTML = "";
                // volta para a tela inicial após imprimir do histórico também
                showInitialScreen();
            }, 700);
        });
        return;
    }
};

$("closeHistory").onclick = () => { $("historyModal").style.display = "none"; }
document.getElementById("historyModal").onclick = (e) => { if (e.target.id === "historyModal") $("historyModal").style.display = "none"; }

$("searchName").oninput = () => renderClients($("searchName").value, $("searchId").value);
$("searchId").oninput = () => renderClients($("searchName").value, $("searchId").value);

/* initial render and attach listeners for suggestions */
renderClients();
renderProducts();
renderAllDatalists();
attachSuggestionListeners();

