// Substitua pela URL da sua implantação do Apps Script (terminada em /exec)
const API_URL = "https://script.google.com/macros/s/AKfycbyBCtztXvxazxFrRezp2IAJJpQ_U4LMEkevxbrz34T7gyGJbbi4E5mAzmP059o5u4uNXQ/exec";

let allItems = [];
let selectedImageBase64 = "";

document.addEventListener("DOMContentLoaded", () => {
    loadFromGoogleSheets();
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`tab-${tabName}-btn`).classList.add('active');
}

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

        alert('✅ Item publicado no Balcão com sucesso!');
        document.getElementById('form-announce').reset();
        selectedImageBase64 = "";
        switchTab('catalog');
        setTimeout(loadFromGoogleSheets, 1500);
    } catch (error) {
        alert('Ocorreu um erro ao salvar o item.');
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Publicar no Balcão`;
    }
}

async function loadFromGoogleSheets() {
    const loadingEl = document.getElementById('loading');
    const catalogEl = document.getElementById('catalog-list');

    if (!API_URL || API_URL.includes("COLE_SUA_URL")) {
        loadingEl.innerHTML = "<p>⚠️ Configure a URL do Google Apps Script no arquivo script.js.</p>";
        return;
    }

    loadingEl.style.display = "block";
    catalogEl.innerHTML = "";

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            allItems = data;
        } else {
            allItems = [];
            console.error("A resposta da API não é uma lista válida:", data);
        }
        
        loadingEl.style.display = "none";
        filterItems();
    } catch (error) {
        loadingEl.innerHTML = "<p>Erro ao conectar com a base de dados do Google Sheets.</p>";
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
        catalogEl.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #64748b; padding: 2rem;'>Nenhum item encontrado com os filtros selecionados.</p>";
        return;
    }

    items.slice().reverse().forEach(item => {
        const imgSource = item.image || 'https://via.placeholder.com/400x250?text=Sem+Imagem';
        
        // Define classe CSS de acordo com o status
        const statusText = item.status || 'Disponível';
        let statusClass = 'disponivel';
        if (statusText.toLowerCase().includes('solicita')) {
            statusClass = 'solicitacao';
        } else if (statusText.toLowerCase().includes('transf')) {
            statusClass = 'transferido';
        }

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
                    <p><i class="fa-solid fa-school"></i> ${item.school || 'Escola não informada'}</p>
                    <p><i class="fa-solid fa-location-dot"></i> ${item.location || 'Localização não informada'}</p>
                </div>
                <div class="card-meta-row">
                    <span><strong>Qtd:</strong> ${item.quantity || 1}</span>
                    <span><strong>Estado:</strong> ${item.condition || 'Não informado'}</span>
                </div>
                <button class="btn-card-action" onclick="showItemDetails('${item.contactPerson || ''}', '${item.phone || ''}', '${item.title || ''}')">
                    <i class="fa-solid fa-circle-info"></i> Ver Detalhes e Solicitar
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

function showItemDetails(contactPerson, phone, itemTitle) {
    alert(`📋 Solicitação do item: "${itemTitle}"\n\nResponsável: ${contactPerson || 'Não informado'}\nContato / WhatsApp: ${phone || 'Não informado'}`);
}
