const API_URL = "https://script.google.com/macros/s/AKfycbyBCtztXvxazxFrRezp2IAJJpQ_U4LMEkevxbrz34T7gyGJbbi4E5mAzmP059o5u4uNXQ/exec";

let allItems = [];
let selectedImageBase64 = "";
let currentSelectedItem = null;
let allRequests = [];

const DEFAULT_REQUESTS = [
    {
        id: "req-1001",
        itemTitle: "Armário de Aço 2 Portas Reforçado",
        patrimony: "PAT-2018-0045",
        solicitaireSchool: "E. E. Paraisense",
        solicitaireContact: "Luciana M. (Gestora) ((31) 98888-0011)",
        donorSchool: "E. E. Cel. Lucas Magalhães",
        date: "2026-09-15",
        status: "Concluído",
        requestedQuantity: 1
    }
];

document.addEventListener("DOMContentLoaded", () => {

    // Carrega somente o catálogo ao abrir o site
    loadFromGoogleSheets();

    const modalOverlay = document.getElementById('modal-details');

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }
});

/* ==========================================================================
   NAVEGAÇÃO POR ABAS
   ========================================================================== */
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabName}`);
    const targetBtn = document.getElementById(`tab-${tabName}-btn`);

    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');

    if (tabName === 'requests') {
        loadRequestsFromGoogleSheets();
    }
}
/* ==========================================================================
   CARREGAMENTO E EXIBIÇÃO DO CATÁLOGO
   ========================================================================== */
async function loadFromGoogleSheets() {
    const loadingEl = document.getElementById('loading');
    const catalogEl = document.getElementById('catalog-list');

    if (!API_URL || API_URL.includes("COLE_SUA_URL")) {
        loadingEl.innerHTML = "<p>⚠️ Configure a URL do Google Apps Script no script.js.</p>";
        return;
    }

    loadingEl.style.display = "block";
    catalogEl.innerHTML = "";

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        allItems = Array.isArray(data) ? data : [];
        loadingEl.style.display = "none";
        filterItems();
    } catch (error) {
        loadingEl.innerHTML = "<p>Erro ao carregar dados do balcão.</p>";
        console.error(error);
    }
}

function renderCatalog(items) {
    const catalogEl = document.getElementById('catalog-list');
    const counterEl = document.getElementById('item-counter');
    catalogEl.innerHTML = "";

    if (counterEl) {
        counterEl.textContent = `Mostrando ${items ? items.length : 0} item(ns)`;
    }

    if (!Array.isArray(items) || items.length === 0) {
        catalogEl.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #64748b; padding: 2rem;'>Nenhum item encontrado.</p>";
        return;
    }

    items.slice().reverse().forEach(item => {
        const imgSource = item.image || 'https://via.placeholder.com/400x250?text=Sem+Imagem';
        const statusText = item.status || 'Disponível';
        let statusClass = 'disponivel';
        
        if (statusText.toLowerCase().includes('solicita')) statusClass = 'solicitacao';
        else if (statusText.toLowerCase().includes('transf')) statusClass = 'transferido';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-img-container">
                <img src="${imgSource}" alt="${item.title || 'Item'}">
                <span class="badge-status ${statusClass}">${statusText}</span>
                <span class="badge-category">${item.category || 'Geral'}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${item.title || 'Sem título'}</h3>
                <div class="card-location-info">
                    <p><i class="fa-solid fa-school"></i> ${item.school || 'Não informado'}</p>
                    <p><i class="fa-solid fa-location-dot"></i> ${item.location || 'Não informado'}</p>
                </div>
                <div class="card-meta-row">
                    <span><strong>Qtd:</strong> ${item.quantity || 1}</span>
                    <span><strong>Estado:</strong> ${item.condition || 'Não informado'}</span>
                </div>
                <button class="btn-card-action" onclick="openModal('${item.id}')">
                    <i class="fa-solid fa-circle-info"></i> Ver detalhes e Solicitar
                </button>
            </div>
        `;
        catalogEl.appendChild(card);
    });
}

function filterItems() {
    const search = (document.getElementById('search-input')?.value || '').toLowerCase();
    const category = document.getElementById('filter-category')?.value || '';
    const condition = document.getElementById('filter-condition')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';

    const filtered = allItems.filter(item => {
        const title = String(item.title || '').toLowerCase();
        const school = String(item.school || '').toLowerCase();
        const location = String(item.location || '').toLowerCase();
        const patrimony = String(item.patrimony || '').toLowerCase();

        const matchesSearch = !search || title.includes(search) || school.includes(search) || location.includes(search) || patrimony.includes(search);
        const matchesCategory = !category || item.category === category;
        const matchesCondition = !condition || item.condition === condition;
        const matchesStatus = !status || item.status === status;

        return matchesSearch && matchesCategory && matchesCondition && matchesStatus;
    });

    renderCatalog(filtered);
}

function clearFilters() {
    if (document.getElementById('search-input')) document.getElementById('search-input').value = '';
    if (document.getElementById('filter-category')) document.getElementById('filter-category').value = '';
    if (document.getElementById('filter-condition')) document.getElementById('filter-condition').value = '';
    if (document.getElementById('filter-status')) document.getElementById('filter-status').value = '';
    renderCatalog(allItems);
}

/* ==========================================================================
   AÇÕES DA JANELA MODAL (VER DETALHES E SOLICITAR)
   ========================================================================== */
function openModal(itemId) {
    const item = allItems.find(i => String(i.id) === String(itemId));
    if (!item) return;

    currentSelectedItem = item;

    document.getElementById('modal-category-badge').textContent = item.category || 'Geral';
    document.getElementById('modal-item-title').textContent = item.title || 'Sem título';
    document.getElementById('modal-school').textContent = item.school || 'Não informado';
    document.getElementById('modal-location').textContent = item.location || 'Não informado';
    document.getElementById('modal-quantity').textContent = item.quantity || '1';
    document.getElementById('modal-condition').textContent = item.condition || 'Não informado';
    document.getElementById('modal-patrimony').textContent = item.patrimony || 'Não possui / S/N';
    document.getElementById('modal-contact-person').textContent = item.contactPerson || 'Não informado';
    document.getElementById('modal-contact-phone').textContent = item.phone || 'Não informado';
    document.getElementById('modal-item-description').textContent = item.description || 'Sem descrição informada.';
    
    const imgEl = document.getElementById('modal-item-image');
    imgEl.src = item.image || 'https://via.placeholder.com/400x250?text=Sem+Imagem';

    document.getElementById('form-modal-request').reset();

    // Configura dinamicamente o limite do campo de quantidade desejada
    const reqQtyInput = document.getElementById('req-quantity');
    if (reqQtyInput) {
        const availableQty = parseInt(item.quantity, 10) || 1;
        reqQtyInput.min = "1";
        reqQtyInput.max = availableQty.toString();
        reqQtyInput.value = "1";
    }

    const modalEl = document.getElementById('modal-details');
    if (modalEl) modalEl.classList.add('active');
}

function closeModal() {
    const modalEl = document.getElementById('modal-details');
    if (modalEl) modalEl.classList.remove('active');
    currentSelectedItem = null;
}

async function handleModalSubmit(e) {
    e.preventDefault();

    if (!currentSelectedItem) {
        alert("Não foi possível identificar o item selecionado.");
        return;
    }

    const submitBtn = document.querySelector('#form-modal-request .btn-modal-confirm');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enviando...`;
    }

    const schoolName = document.getElementById('req-school').value;
    const responsible = document.getElementById('req-responsible').value;
    const email = document.getElementById('req-email').value;
    const phone = document.getElementById('req-phone').value;
    const justification = document.getElementById('req-justification').value;
    const requestedQuantity = parseInt(
        document.getElementById('req-quantity').value,
        10
    ) || 1;

    // Data no horário local
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    const newRequest = {
        action: "createRequest",

        id: "req-" + Date.now(),

        // Identificação do bem
        itemId: currentSelectedItem.id || "",
        itemTitle: currentSelectedItem.title || "",
        patrimony: currentSelectedItem.patrimony || "S/N",

        // Escola doadora
        donorSchool: currentSelectedItem.school || "Escola Doadora",

        // Escola solicitante
        requesterSchool: schoolName,
        requesterResponsible: responsible,
        requesterEmail: email,
        requesterPhone: phone,

        // Solicitação
        requestedQuantity: requestedQuantity,
        justification: justification,

        // Controle
        date: today,
        status: "Pendente"
    };

    try {

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(newRequest)
        });

        const responseText = await response.text();

        let result;

        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error("A API retornou uma resposta inválida.");
        }

        if (!response.ok || result.result !== "success") {
            throw new Error(
                result.error || "Não foi possível registrar a solicitação."
            );
        }

        // Limpa o formulário
        document.getElementById('form-modal-request').reset();

        closeModal();

        alert("✅ Solicitação de transferência registrada com sucesso!");

        // Vai para a aba de solicitações
        switchTab('requests');

    } catch (error) {

        console.error("Erro ao registrar solicitação:", error);

        alert(
            "❌ Não foi possível registrar a solicitação.\n\n" +
            error.message
        );

    } finally {

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML =
                `<i class="fa-solid fa-paper-plane"></i> Confirmar Solicitação`;
        }
    }
}

/* ==========================================================================
   CADASTRO DE NOVOS ITENS (ABA ANUNCIAR)
   ========================================================================== */
function handleImageCompress(event) {
    const file = event.target.files[0];
    if (!file) {
        selectedImageBase64 = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const maxWidth = 350;
            const scaleSize = maxWidth / img.width;

            if (scaleSize < 1) {
                canvas.width = maxWidth;
                canvas.height = img.height * scaleSize;
            } else {
                canvas.width = img.width;
                canvas.height = img.height;
            }

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            selectedImageBase64 = canvas.toDataURL("image/jpeg", 0.4);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function handleAnnounceSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enviando...`;

    const newItem = {
        id: Date.now().toString(),
        title: document.getElementById('announce-title').value,
        category: document.getElementById('announce-category').value,
        quantity: parseInt(document.getElementById('announce-quantity').value, 10) || 1,
        condition: document.getElementById('announce-condition').value,
        patrimony: document.getElementById('announce-patrimony').value || 'S/N',
        description: document.getElementById('announce-description').value,
        school: document.getElementById('announce-school').value,
        location: document.getElementById('announce-location').value,
        contactPerson: document.getElementById('announce-contact-person').value,
        phone: document.getElementById('announce-phone').value,
        status: 'Disponível',
        image: selectedImageBase64 || ''
    };

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(newItem)
        });

        alert('✅ Item publicado com sucesso!');
        document.getElementById('form-announce').reset();
        selectedImageBase64 = "";
        switchTab('catalog');
        setTimeout(loadFromGoogleSheets, 1500);
    } catch (error) {
        alert('Erro ao salvar item.');
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Publicar no Balcão`;
    }
}

async function loadRequestsFromGoogleSheets() {

    const tbody = document.getElementById('requests-table-body');
    const badgeEl = document.getElementById('requests-badge-count');

    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align:center; color:#64748b; padding:2rem;">
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                Carregando solicitações...
            </td>
        </tr>
    `;

    try {

        const response = await fetch(
            `${API_URL}?action=getRequests&_=${Date.now()}`
        );

        if (!response.ok) {
            throw new Error("Erro ao consultar a API.");
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("A API retornou dados inválidos.");
        }

        allRequests = data;

        renderRequestsTable();

    } catch (error) {

        console.error("Erro ao carregar solicitações:", error);

        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; color:#dc2626; padding:2rem;">
                    Não foi possível carregar as solicitações.
                </td>
            </tr>
        `;

        if (badgeEl) {
            badgeEl.textContent = "0";
        }
    }
}

/* ==========================================================================
   HISTÓRICO DE SOLICITAÇÕES
   ========================================================================== */
function initRequestsStorage() {
    if (!localStorage.getItem('edureuso_requests')) {
        localStorage.setItem('edureuso_requests', JSON.stringify(DEFAULT_REQUESTS));
    }
}

function getStoredRequests() {
    try {
        return JSON.parse(localStorage.getItem('edureuso_requests')) || [];
    } catch (e) {
        return [];
    }
}

function saveRequests(requests) {
    localStorage.setItem('edureuso_requests', JSON.stringify(requests));
    renderRequestsTable();
}

function renderRequestsTable() {

    const tbody = document.getElementById('requests-table-body');
    const badgeEl = document.getElementById('requests-badge-count');

    if (!tbody) return;

    const requests = Array.isArray(allRequests)
        ? allRequests
        : [];

    /* ----------------------------------------------------------------------
       Contador de solicitações pendentes
       ---------------------------------------------------------------------- */

    if (badgeEl) {

        const pendingCount = requests.filter(
            r => String(r.status || '').toLowerCase() === 'pendente'
        ).length;

        badgeEl.textContent = pendingCount;
    }

    tbody.innerHTML = "";

    /* ----------------------------------------------------------------------
       Nenhuma solicitação
       ---------------------------------------------------------------------- */

    if (requests.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="5"
                    style="text-align:center; color:#64748b; padding:2rem;">
                    Nenhuma solicitação de transferência registrada até o momento.
                </td>
            </tr>
        `;

        return;
    }

    /* ----------------------------------------------------------------------
       Ordenação - mais recentes primeiro
       ---------------------------------------------------------------------- */

    const orderedRequests = [...requests].reverse();

    orderedRequests.forEach(req => {

        const tr = document.createElement('tr');

        const status = req.status || "Pendente";

        let statusClass = "pendente";

        if (
            status === "Concluído" ||
            status === "Aprovada" ||
            status === "Transferido"
        ) {
            statusClass = "concluido";
        }

        const qtyText = req.requestedQuantity
            ? ` (Qtd: ${req.requestedQuantity})`
            : '';

        tr.innerHTML = `
            <td>
                <div class="item-main-title">
                    ${req.itemTitle || 'Item não informado'}${qtyText}
                </div>

                <div class="item-sub-patrimony">
                    Tombo: ${req.patrimony || 'S/N'}
                </div>
            </td>

            <td>
                <div class="school-main-title">
                    ${req.requesterSchool || 'Não informado'}
                </div>

                <div class="school-sub-contact">
                    ${req.requesterResponsible || ''}
                </div>
            </td>

            <td>
                ${req.donorSchool || 'Não informado'}
            </td>

            <td>
                ${formatRequestDate(req.date)}
            </td>

            <td>
                <span class="status-pill ${statusClass}">
                    ${status}
                </span>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function formatRequestDate(dateValue) {

    if (!dateValue) {
        return "--";
    }

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleDateString('pt-BR');
}
