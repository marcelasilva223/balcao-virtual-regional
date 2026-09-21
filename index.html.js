async function handleAnnounceSubmit(e) {
    e.preventDefault();

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
        // Usa text/plain para evitar bloqueios de CORS do Google Apps Script
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(newItem)
        });

        alert('✅ Item publicado com sucesso!');
        document.getElementById('form-announce').reset();
        switchTab('catalog');
        setTimeout(loadFromGoogleSheets, 1500); // Aguarda 1.5s para a planilha processar
    } catch (error) {
        alert('Ocorreu um erro ao salvar o item.');
        console.error(error);
    }
}
