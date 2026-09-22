// Substitua pela URL da sua implantação do Apps Script (terminada em /exec)
const API_URL = "https://script.google.com/macros/s/AKfycbyBCtztXvxazxFrRezp2IAJJpQ_U4LMEkevxbrz34T7gyGJbbi4E5mAzmP059o5u4uNXQ/exec";

let allItems = [];
let selectedImageBase64 = "";

document.addEventListener("DOMContentLoaded", () => {
    loadFromGoogleSheets();
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

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
            const maxWidth = 500;
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
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Envio em formato seguro (evita travamentos de CORS)
async function handleAnnounceSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enviando...`;

    const newItem = {
        id: Date.now().toString(),
        title: document.getElementById('announce-title').value,
        category: document.getElementById('announce-category').value,
        quantity: parseInt(document.getElementById('announce-quantity').value),
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
        setTimeout(loadFromGoogleSheets, 2000);
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
        allItems = await response.json();
        
        loadingEl.style.display = "none";
        renderCatalog(allItems);
    } catch (error) {
        loadingEl.innerHTML = "<p>Erro ao conectar com a base de dados do Google Sheets.</p>";
        console.error(error);
    }
}

function renderCatalog(items) {
    const catalogEl = document.getElementById('catalog-list');
    catalogEl.innerHTML = "";

    if (!items || items.length === 0) {
        catalogEl.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #64748b; padding: 2rem;'>Nenhum item disponível no momento.</p>";
        return;
    }

    items.slice().reverse().forEach(item => {
        const imgSource = item.image || 'https://via.placeholder.com/400x250?text=Sem+Imagem';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-img-container">
                <img src="${imgSource}" alt="${item.title}">
                <span class="card-badge">${item.category || 'Geral'}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${item.title}</h3>
                <ul class="card-info-list">
                    <li><i class="fa-solid fa-boxes-stacked"></i> <strong>Qtd:</strong> ${item.quantity} un.</li>
                    <li><i class="fa-solid fa-circle-check"></i> <strong>Estado:</strong> ${item.condition}</li>
                    <li><i class="fa-solid fa-barcode"></i> <strong>Patrimônio:</strong> ${item.patrimony}</li>
                    <li><i class="fa-solid fa-school"></i> <strong>Escola:</strong> ${item.school}</li>
                    <li><i class="fa-solid fa-location-dot"></i> <strong>Local:</strong> ${item.location}</li>
                    <li><i class="fa-solid fa-phone"></i> <strong>Contato:</strong> ${item.contactPerson} (${item.phone})</li>
                </ul>
                ${item.description ? `<div class="card-description">${item.description}</div>` : ''}
            </div>
        `;
        catalogEl.appendChild(card);
    });
}

function filterItems() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = allItems.filter(item => {
        return (
            (item.title && item.title.toLowerCase().includes(query)) ||
            (item.school && item.school.toLowerCase().includes(query)) ||
            (item.category && item.category.toLowerCase().includes(query)) ||
            (item.location && item.location.toLowerCase().includes(query)) ||
            (item.patrimony && item.patrimony.toString().toLowerCase().includes(query))
        );
    });
    renderCatalog(filtered);
}
