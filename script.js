// Substitua pela URL da sua implantação do Apps Script (terminada em /exec)
const API_URL = "https://script.google.com/macros/s/AKfycbyyN2ZV5_22OE8Za8b_E-S8tfec5xej7_o4UM3vQ3Q2U8r5TX18-SnpDBKJqdkGx4sA3g/exec";

let allItems = [];
let selectedImageBase64 = "";

document.addEventListener("DOMContentLoaded", () => {
    loadFromGoogleSheets();
});

// Alterna entre as abas do sistema
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-white/10', 'text-white');
        btn.classList.add('text-slate-200');
    });

    const targetTab = document.getElementById(`tab-${tabName}`);
    const targetNav = document.getElementById(`nav-${tabName}`);

    if (targetTab) targetTab.classList.remove('hidden');
    if (targetNav) {
        targetNav.classList.add('bg-white/10', 'text-white');
        targetNav.classList.remove('text-slate-200');
    }

    if (tabName === 'catalog') {
        applyFilters();
    }
}

// Menu Mobile
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const icon = document.getElementById('mobile-menu-icon');
    
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        icon.classList.replace('fa-bars', 'fa-xmark');
    } else {
        menu.classList.add('hidden');
        icon.classList.replace('fa-xmark', 'fa-bars');
    }
}

// Compacta a imagem antes de enviar para não exceder limites do Google Sheets
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        selectedImageBase64 = "";
        document.getElementById('image-preview-container').classList.add('hidden');
        document.getElementById('image-placeholder-icon').classList.remove('hidden');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const maxWidth = 600;
            const scaleSize = maxWidth / img.width;

            if (scaleSize < 1) {
                canvas.width = maxWidth;
                canvas.height = img.height * scaleSize;
            } else {
                canvas.width = img.width;
                canvas.height = img.height;
            }

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            selectedImageBase64 = canvas.toDataURL("image/jpeg", 0.6);

            // Atualiza Pré-visualização na tela
            const preview = document.getElementById('image-preview');
            preview.src = selectedImageBase64;
            document.getElementById('image-preview-container').classList.remove('hidden');
            document.getElementById('image-placeholder-icon').classList.add('hidden');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Envio dos dados para o Google Sheets via API
async function handleAnnounceSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Enviando...`;

    const newItem = {
        id: Date.now().toString(),
        title: document.getElementById('announce-title').value,
        category: document.getElementById('announce-category').value,
        quantity: parseInt(document.getElementById('announce-quantity').value) || 1,
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

        alert('✅ Item publicado com sucesso no Google Sheets!');
        document.getElementById('form-announce').reset();
        
        const fileInput = document.getElementById('announce-image-file');
        if (fileInput) fileInput.value = "";
        
        selectedImageBase64 = "";
        document.getElementById('image-preview-container').classList.add('hidden');
        document.getElementById('image-placeholder-icon').classList.remove('hidden');
        
        switchTab('catalog');
        setTimeout(loadFromGoogleSheets, 1500);
    } catch (error) {
        alert('❌ Ocorreu um erro ao salvar o item.');
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane mr-2"></i> Publicar Anúncio`;
    }
}

// Carregar Itens do Google Sheets
async function loadFromGoogleSheets() {
    const gridEl = document.getElementById('items-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (!API_URL || API_URL.includes("COLE_AQUI_O_SEU_URL")) {
        gridEl.innerHTML = `<p class="col-span-full text-center text-red-500 py-8">⚠️ Configure a URL do Google Apps Script no ficheiro script.js.</p>`;
        return;
    }

    gridEl.innerHTML = `<div class="col-span-full text-center py-12 text-slate-500"><i class="fa-solid fa-spinner fa-spin text-3xl mb-2 text-brand-600"></i><p>A carregar catálogo de bens...</p></div>`;

    try {
        const response = await fetch(API_URL);
        allItems = await response.json();
        applyFilters();
    } catch (error) {
        gridEl.innerHTML = `<p class="col-span-full text-center text-red-500 py-8">Erro ao ligar à base de dados do Google Sheets.</p>`;
        console.error(error);
    }
}

// Filtragem
function applyFilters() {
    const searchTerm = document.getElementById('filter-search').value.toLowerCase();
    const categoryTerm = document.getElementById('filter-category').value;
    const conditionTerm = document.getElementById('filter-condition').value;
    const statusTerm = document.getElementById('filter-status').value;

    const filtered = allItems.filter(item => {
        const titleMatch = (item.title || '').toLowerCase().includes(searchTerm);
        const schoolMatch = (item.school || '').toLowerCase().includes(searchTerm);
        const patrimonyMatch = (item.patrimony || '').toString().toLowerCase().includes(searchTerm);
        
        const matchSearch = titleMatch || schoolMatch || patrimonyMatch;
        const matchCategory = categoryTerm === '' || item.category === categoryTerm;
        const matchCondition = conditionTerm === '' || item.condition === conditionTerm;
        const matchStatus = statusTerm === '' || item.status === statusTerm;

        return matchSearch && matchCategory && matchCondition && matchStatus;
    });

    renderGrid(filtered);
}

function resetFilters() {
    document.getElementById('filter-search').value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-condition').value = '';
    document.getElementById('filter-status').value = '';
    applyFilters();
}

// Renderizar Cartões
function renderGrid(itemsToRender) {
    const gridEl = document.getElementById('items-grid');
    const emptyState = document.getElementById('empty-state');
    const countSpan = document.getElementById('results-count');

    gridEl.innerHTML = '';
    countSpan.textContent = `Mostrando ${itemsToRender.length} itens`;

    if (!itemsToRender || itemsToRender.length === 0) {
        gridEl.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }

    gridEl.classList.remove('hidden');
    emptyState.classList.add('hidden');

    itemsToRender.slice().reverse().forEach(item => {
        const imgSrc = item.image && item.image.length > 50 
            ? item.image 
            : 'https://via.placeholder.com/400x250?text=Sem+Imagem';

        const cleanPhone = (item.phone || '').replace(/\D/g, '');
        const whatsappMsg = encodeURIComponent(`Olá! Vi o anúncio do item "${item.title}" (Patrimônio: ${item.patrimony || 'S/N'}) no Balcão Virtual EduReuso e gostaria de solicitar a transferência para a nossa escola.`);
        const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${whatsappMsg}`;

        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow';
        card.innerHTML = `
            <div class="h-48 bg-slate-100 relative">
                <img src="${imgSrc}" class="w-full h-full object-cover" alt="${item.title}">
                <span class="absolute top-3 right-3 bg-brand-800 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow">
                    ${item.status || 'Disponível'}
                </span>
            </div>
            <div class="p-4 flex flex-col flex-grow">
                <div class="text-xs text-brand-600 font-semibold mb-1 uppercase tracking-wider">${item.category || 'Geral'}</div>
                <h3 class="font-bold text-slate-800 text-lg mb-2 line-clamp-1">${item.title}</h3>
                
                <div class="space-y-1.5 text-xs text-slate-600 mb-4">
                    <p><i class="fa-solid fa-boxes-stacked w-4 text-slate-400"></i> <strong>Qtd:</strong> ${item.quantity} un.</p>
                    <p><i class="fa-solid fa-circle-check w-4 text-slate-400"></i> <strong>Estado:</strong> ${item.condition}</p>
                    <p><i class="fa-solid fa-school w-4 text-slate-400"></i> <strong>Escola:</strong> ${item.school}</p>
                    <p><i class="fa-solid fa-location-dot w-4 text-slate-400"></i> <strong>Local:</strong> ${item.location}</p>
                    <p><i class="fa-solid fa-barcode w-4 text-slate-400"></i> <strong>Tombo:</strong> ${item.patrimony || 'S/N'}</p>
                    <p><i class="fa-solid fa-user w-4 text-slate-400"></i> <strong>Contato:</strong> ${item.contactPerson || item.contact || 'N/A'}</p>
                </div>

                ${item.description ? `<p class="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border-l-2 border-brand-600 mb-4 italic">${item.description}</p>` : ''}
                
                <div class="mt-auto pt-3 border-t border-slate-100">
                    <a href="${whatsappUrl}" target="_blank" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-3 rounded-lg transition-colors text-xs flex items-center justify-center space-x-2">
                        <i class="fa-brands fa-whatsapp text-sm"></i>
                        <span>Solicitar Transferência via WhatsApp</span>
                    </a>
                </div>
            </div>
        `;
        gridEl.appendChild(card);
    });
}
