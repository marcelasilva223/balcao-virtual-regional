// Substitua pela URL da sua implantação do Apps Script (terminada em /exec)
const API_URL = "https://script.google.com/macros/s/AKfycbyBCtztXvxazxFrRezp2IAJJpQ_U4LMEkevxbrz34T7gyGJbbi4E5mAzmP059o5u4uNXQ/exec";

let allItems = [];
let selectedImageBase64 = "";

document.addEventListener("DOMContentLoaded", () => {
    loadFromGoogleSheets();
});

// Muda entre as abas Catálogo e Formulário
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-tabs button').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`tab-${tabName}-btn`).classList.add('active');
}

// Comprime a imagem para não sobrecarregar a planilha
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

            // Redimensiona mantendo a proporção (largura máxima 500px)
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
            // Comprime em JPEG qualidade 0.6
            selectedImageBase64 = canvas.toDataURL("image/jpeg", 0.6);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Envia o formulário para o Google Apps Script
async function handleAnnounceSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerText = "Enviando...";

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
        // Envio no formato no-cors para garantir que o Google receba sem bloquear
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newItem)
        });

        alert('✅ Item publicado com sucesso!');
        document.getElementById('form-announce').reset();
        selectedImageBase64 = "";
        switchTab('catalog');
        setTimeout(loadFromGoogleSheets, 2000); 
    } catch (error) {
        alert('Ocorreu um erro ao salvar o item.');
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "Publicar Item no Balcão";
    }
}

// Busca os itens na planilha via GET
async function loadFromGoogleSheets() {
    const loadingEl = document.getElementById('loading');
    const catalogEl = document.getElementById('catalog-list');
    
    if (!API_URL || API_URL.includes("COLE_SUA_URL")) {
        loadingEl.innerText = "Por favor, configure a URL do seu Google Apps Script no script.js.";
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
        loadingEl.innerText = "Erro ao carregar itens da planilha.";
        console.error(error);
    }
}

// Renderiza os cards na tela
function renderCatalog(items) {
    const catalogEl = document.getElementById('catalog-list');
    catalogEl.innerHTML = "";

    if (items.length === 0) {
        catalogEl.innerHTML = "<p>Nenhum item anunciado até o momento.</p>";
        return;
    }

    // Inverte o array para mostrar os mais novos primeiro
    items.slice().reverse().forEach(item => {
        const imgSource = item.image || 'https://via.placeholder.com/300x180?text=Sem+Foto';
        
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${imgSource}" alt="${item.title}">
            <div class="card-body">
                <span class="tag">${item.category}</span>
                <h3>${item.title}</h3>
                <p class="card-info"><strong>Quantidade:</strong> ${item.quantity} un.</p>
                <p class="card-info"><strong>Estado:</strong> ${item.condition}</p>
                <p class="card-info"><strong>Patrimônio:</strong> ${item.patrimony}</p>
                <p class="card-info"><strong>Escola:</strong> ${item.school} (${item.location})</p>
                <p class="card-info"><strong>Contato:</strong> ${item.contactPerson} - ${item.phone}</p>
                ${item.description ? `<p class="card-info" style="margin-top:0.5rem; color:#555;"><em>"${item.description}"</em></p>` : ''}
            </div>
        `;
        catalogEl.appendChild(card);
    });
}

// Filtra itens na busca em tempo real
function filterItems() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = allItems.filter(item => {
        return (
            (item.title && item.title.toLowerCase().includes(query)) ||
            (item.school && item.school.toLowerCase().includes(query)) ||
            (item.category && item.category.toLowerCase().includes(query)) ||
            (item.location && item.location.toLowerCase().includes(query))
        );
    });
    renderCatalog(filtered);
}
