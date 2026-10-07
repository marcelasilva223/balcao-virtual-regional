const API_URL = "https://script.google.com/macros/s/AKfycbyBCtztXvxazxFrRezp2IAJJpQ_U4LMEkevxbrz34T7gyGJbbi4E5mAzmP059o5u4uNXQ/exec";

let allItems = [];
let selectedImageBase64 = "";
let currentSelectedItem = null;
let allRequests = [];

/* ==========================================================================
   INICIALIZAÇÃO
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

    // Carrega o catálogo ao abrir o site
    loadFromGoogleSheets();

    // Ativa os filtros da aba de solicitações
    setupRequestFilters();

    // Fecha o modal do catálogo ao clicar fora dele
    const modalOverlay = document.getElementById("modal-details");

    if (modalOverlay) {
        modalOverlay.addEventListener("click", (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }

    // Fecha o modal de detalhes da solicitação ao clicar fora dele
    const requestDetailsModal = document.getElementById(
        "modal-request-details"
    );

    if (requestDetailsModal) {
        requestDetailsModal.addEventListener("click", (e) => {
            if (e.target === requestDetailsModal) {
                closeRequestDetails();
            }
        });
    }
});


/* ==========================================================================
   NAVEGAÇÃO POR ABAS
   ========================================================================== */

function switchTab(tabName) {

    document
        .querySelectorAll(".tab-content")
        .forEach(tab => tab.classList.remove("active"));

    document
        .querySelectorAll(".nav-btn")
        .forEach(btn => btn.classList.remove("active"));


    const targetTab = document.getElementById(`tab-${tabName}`);
    const targetBtn = document.getElementById(`tab-${tabName}-btn`);


    if (targetTab) {
        targetTab.classList.add("active");
    }

    if (targetBtn) {
        targetBtn.classList.add("active");
    }


    // Sempre que abrir a aba de solicitações,
    // busca os dados atualizados da planilha.
    if (tabName === "requests") {
        loadRequestsFromGoogleSheets();
    }
}


/* ==========================================================================
   CARREGAMENTO DO CATÁLOGO
   ========================================================================== */

async function loadFromGoogleSheets() {

    const loadingEl = document.getElementById("loading");
    const catalogEl = document.getElementById("catalog-list");


    if (!loadingEl || !catalogEl) {
        return;
    }


    if (!API_URL || API_URL.includes("COLE_SUA_URL")) {

        loadingEl.innerHTML =
            "<p>⚠️ Configure a URL do Google Apps Script no script.js.</p>";

        return;
    }


    loadingEl.style.display = "block";
    catalogEl.innerHTML = "";


    try {

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Erro ao consultar a API.");
        }


        const data = await response.json();


        if (!Array.isArray(data)) {
            throw new Error("A API retornou dados inválidos.");
        }


        allItems = data;


        loadingEl.style.display = "none";

        filterItems();


    } catch (error) {

        loadingEl.innerHTML =
            "<p>Erro ao carregar dados do balcão.</p>";

        console.error(
            "Erro ao carregar catálogo:",
            error
        );
    }
}


/* ==========================================================================
   RENDERIZAÇÃO DO CATÁLOGO
   ========================================================================== */

function renderCatalog(items) {

    const catalogEl = document.getElementById("catalog-list");
    const counterEl = document.getElementById("item-counter");


    if (!catalogEl) {
        return;
    }


    catalogEl.innerHTML = "";


    if (counterEl) {

        counterEl.textContent =
            `Mostrando ${items ? items.length : 0} item(ns)`;
    }


    if (!Array.isArray(items) || items.length === 0) {

        catalogEl.innerHTML = `
            <p style="
                grid-column: 1/-1;
                text-align: center;
                color: #64748b;
                padding: 2rem;
            ">
                Nenhum item encontrado.
            </p>
        `;

        return;
    }


    // Mais recentes primeiro
    items
        .slice()
        .reverse()
        .forEach(item => {

            const imgSource =
                item.image ||
                "https://via.placeholder.com/400x250?text=Sem+Imagem";

            const statusText =
                item.status || "Disponível";


            let statusClass = "disponivel";


            if (
                String(statusText)
                    .toLowerCase()
                    .includes("solicita")
            ) {

                statusClass = "solicitacao";

            } else if (
                String(statusText)
                    .toLowerCase()
                    .includes("transf")
            ) {

                statusClass = "transferido";

             } else if (
                String(statusText)
                    .toLowerCase()
                    .includes("indispon")
            ) {
                statusClass = "indisponivel";
            }

            const card = document.createElement("div");

            card.className = "card";


            card.innerHTML = `
                <div class="card-img-container">

                    <img
                        src="${imgSource}"
                        alt="${item.title || "Item"}"
                    >

                    <span class="badge-status ${statusClass}">
                        ${statusText}
                    </span>

                    <span class="badge-category">
                        ${item.category || "Geral"}
                    </span>

                </div>


                <div class="card-body">

                    <h3 class="card-title">
                        ${item.title || "Sem título"}
                    </h3>


                    <div class="card-location-info">

                        <p>
                            <i class="fa-solid fa-school"></i>
                            ${item.school || "Não informado"}
                        </p>

                        <p>
                            <i class="fa-solid fa-location-dot"></i>
                            ${item.location || "Não informado"}
                        </p>

                    </div>


               <div class="card-meta-row">
                   <span><strong>Disponível:</strong> ${Number(item.availableQuantity) || 0}</span>
                   <span><strong>Estado:</strong> ${item.condition || 'Não informado'}</span>
               </div>

                    <button
                         class="btn-card-action"
                         onclick="openModal('${item.id}')"
                         ${Number(item.availableQuantity) === 0 ? "disabled" : ""}
                     >
                         <i class="fa-solid ${Number(item.availableQuantity) === 0 ? "fa-ban" : "fa-circle-info"}"></i>
                         ${Number(item.availableQuantity) === 0 ? "Indisponível" : "Ver detalhes e Solicitar"}
                     </button>

                </div>
            `;


            catalogEl.appendChild(card);
        });
}


/* ==========================================================================
   FILTROS DO CATÁLOGO
   ========================================================================== */

function filterItems() {

    const search = (
        document.getElementById("search-input")?.value || ""
    )
        .toLowerCase()
        .trim();


    const category =
        document.getElementById("filter-category")?.value || "";


    const condition =
        document.getElementById("filter-condition")?.value || "";


    const status =
        document.getElementById("filter-status")?.value || "";


    const filtered = allItems.filter(item => {

        const title =
            String(item.title || "").toLowerCase();

        const school =
            String(item.school || "").toLowerCase();

        const location =
            String(item.location || "").toLowerCase();

        const patrimony =
            String(item.patrimony || "").toLowerCase();


        const matchesSearch =
            !search ||
            title.includes(search) ||
            school.includes(search) ||
            location.includes(search) ||
            patrimony.includes(search);


        const matchesCategory =
            !category ||
            item.category === category;


        const matchesCondition =
            !condition ||
            item.condition === condition;

        const matchesStatus =
    status
        ? String(item.status || "").trim() === status
        : String(item.status || "").trim() !== "Indisponível";


        return (
            matchesSearch &&
            matchesCategory &&
            matchesCondition &&
            matchesStatus
        );
    });


    renderCatalog(filtered);
}


function clearFilters() {

    const searchInput =
        document.getElementById("search-input");

    const categorySelect =
        document.getElementById("filter-category");

    const conditionSelect =
        document.getElementById("filter-condition");

    const statusSelect =
        document.getElementById("filter-status");


    if (searchInput) {
        searchInput.value = "";
    }

    if (categorySelect) {
        categorySelect.value = "";
    }

    if (conditionSelect) {
        conditionSelect.value = "";
    }

    if (statusSelect) {
        statusSelect.value = "";
    }


    filterItems();
}


/* ==========================================================================
   MODAL DO ITEM + SOLICITAÇÃO
   ========================================================================== */

function openModal(itemId) {
    const item = allItems.find(i => String(i.id) === String(itemId));
    if (!item) return;

    currentSelectedItem = item;

    const availableQty = Number(item.availableQuantity) || 0;

    document.getElementById('modal-category-badge').textContent =
        item.category || 'Geral';

    document.getElementById('modal-item-title').textContent =
        item.title || 'Sem título';

    document.getElementById('modal-school').textContent =
        item.school || 'Não informado';

    document.getElementById('modal-location').textContent =
        item.location || 'Não informado';

    document.getElementById('modal-quantity').textContent =
        availableQty;

    document.getElementById('modal-condition').textContent =
        item.condition || 'Não informado';

    document.getElementById('modal-patrimony').textContent =
        item.patrimony || 'Não possui / S/N';

    document.getElementById('modal-contact-person').textContent =
        item.contactPerson || 'Não informado';

    document.getElementById('modal-contact-phone').textContent =
        item.phone || 'Não informado';

    document.getElementById('modal-item-description').textContent =
        item.description || 'Sem descrição informada.';

    const imgEl = document.getElementById('modal-item-image');

    imgEl.src =
        item.image ||
        'https://via.placeholder.com/400x250?text=Sem+Imagem';

    document.getElementById('form-modal-request').reset();

    const reqQtyInput =
        document.getElementById('req-quantity');

    const submitBtn =
        document.querySelector(
            '#form-modal-request .btn-modal-confirm'
        );

    if (reqQtyInput) {

        if (availableQty > 0) {

            reqQtyInput.min = "1";
            reqQtyInput.max = availableQty.toString();
            reqQtyInput.value = "1";
            reqQtyInput.disabled = false;

        } else {

            reqQtyInput.removeAttribute('min');
            reqQtyInput.removeAttribute('max');
            reqQtyInput.value = "";
            reqQtyInput.disabled = true;
        }

        let availabilityMessage =
            document.getElementById(
                'req-quantity-availability'
            );

        if (!availabilityMessage) {

            availabilityMessage =
                document.createElement('small');

            availabilityMessage.id =
                'req-quantity-availability';

            availabilityMessage.style.display =
                'block';

            availabilityMessage.style.marginTop =
                '6px';

            availabilityMessage.style.fontSize =
                '13px';

            reqQtyInput.parentElement.appendChild(
                availabilityMessage
            );
        }

        if (availableQty === 0) {

            availabilityMessage.textContent =
                'Não há unidades disponíveis para solicitar no momento.';

            availabilityMessage.style.color =
                '#dc2626';

            availabilityMessage.style.fontWeight =
                '600';

        } else {

            availabilityMessage.textContent =
                `${availableQty} unidade(s) disponível(is) para transferência.`;

            availabilityMessage.style.color =
                '#64748b';

            availabilityMessage.style.fontWeight =
                '400';
        }
    }

    if (submitBtn) {

        submitBtn.disabled =
            availableQty === 0;

        if (availableQty === 0) {

            submitBtn.innerHTML =
                '<i class="fa-solid fa-ban"></i> Sem unidades disponíveis';

        } else {

            submitBtn.innerHTML =
                '<i class="fa-solid fa-paper-plane"></i> Confirmar Solicitação';
        }
    }

    const modalEl =
        document.getElementById('modal-details');

    if (modalEl) {
        modalEl.classList.add('active');
    }
}

function closeModal() {

    const modalEl =
        document.getElementById("modal-details");


    if (modalEl) {
        modalEl.classList.remove("active");
    }


    currentSelectedItem = null;
}

/* ==========================================================================
   ENVIO DA SOLICITAÇÃO
   ========================================================================== */

async function handleModalSubmit(e) {

    e.preventDefault();


    if (!currentSelectedItem) {

        alert(
            "Não foi possível identificar o item selecionado."
        );

        return;
    }


    const submitBtn =
        document.querySelector(
            "#form-modal-request .btn-modal-confirm"
        );


    if (submitBtn) {

        submitBtn.disabled = true;

        submitBtn.innerHTML =
            `<i class="fa-solid fa-spinner fa-spin"></i> Enviando...`;
    }


    const schoolName =
        document.getElementById("req-school")?.value || "";

    const responsible =
        document.getElementById("req-responsible")?.value || "";

    const email =
        document.getElementById("req-email")?.value || "";

    const phone =
        document.getElementById("req-phone")?.value || "";

    const justification =
        document.getElementById("req-justification")?.value || "";

    const requestedQuantity =
        parseInt(
            document.getElementById("req-quantity")?.value,
            10
        ) || 1;


    // Data local do navegador
    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(now.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(now.getDate())
            .padStart(2, "0");


    const today =
        `${year}-${month}-${day}`;


    const newRequest = {

        action: "createRequest",

        id:
            "req-" +
            Date.now(),


        // Bem
        itemId:
            currentSelectedItem.id || "",

        itemTitle:
            currentSelectedItem.title || "",

        patrimony:
            currentSelectedItem.patrimony || "S/N",


        // Escola doadora
        donorSchool:
            currentSelectedItem.school ||
            "Escola Doadora",


        // Escola solicitante
        requesterSchool:
            schoolName,

        requesterResponsible:
            responsible,

        requesterEmail:
            email,

        requesterPhone:
            phone,


        // Solicitação
        requestedQuantity:
            requestedQuantity,

        justification:
            justification,


        // Controle
        date:
            today,

        status:
            "Pendente"
    };


    try {

        const response =
            await fetch(API_URL, {
                method: "POST",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body:
                    JSON.stringify(newRequest)
            });


        const responseText =
            await response.text();


        let result;


        try {

            result =
                JSON.parse(responseText);

        } catch (parseError) {

            throw new Error(
                "A API retornou uma resposta inválida."
            );
        }


        if (
            !response.ok ||
            result.result !== "success"
        ) {

            throw new Error(
                result.error ||
                "Não foi possível registrar a solicitação."
            );
        }


        // Limpa o formulário
        const requestForm =
            document.getElementById(
                "form-modal-request"
            );


        if (requestForm) {
            requestForm.reset();
        }


        closeModal();


        alert(
            "✅ Solicitação de transferência registrada com sucesso!"
        );


        // Atualiza a aba de solicitações
        switchTab("requests");


    } catch (error) {

        console.error(
            "Erro ao registrar solicitação:",
            error
        );


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
   CADASTRO DE NOVOS ITENS
   ========================================================================== */

function handleImageCompress(event) {

    const file =
        event.target.files[0];


    if (!file) {

        selectedImageBase64 = "";

        return;
    }


    const reader =
        new FileReader();


    reader.onload = (e) => {

        const img =
            new Image();


        img.onload = () => {

            const canvas =
                document.createElement("canvas");

            const ctx =
                canvas.getContext("2d");


            const maxWidth = 350;

            const scaleSize =
                maxWidth / img.width;


            if (scaleSize < 1) {

                canvas.width =
                    maxWidth;

                canvas.height =
                    img.height * scaleSize;

            } else {

                canvas.width =
                    img.width;

                canvas.height =
                    img.height;
            }


            ctx.drawImage(
                img,
                0,
                0,
                canvas.width,
                canvas.height
            );


            selectedImageBase64 =
                canvas.toDataURL(
                    "image/jpeg",
                    0.4
                );
        };


        img.src =
            e.target.result;
    };


    reader.readAsDataURL(file);
}


async function handleAnnounceSubmit(e) {

    e.preventDefault();


    const submitBtn =
        document.getElementById("btn-submit");


    if (!submitBtn) {
        return;
    }


    submitBtn.disabled = true;

    submitBtn.innerHTML =
        `<i class="fa-solid fa-spinner fa-spin"></i> Enviando...`;


    const newItem = {

        action:
            "createItem",

        id:
            Date.now().toString(),

        title:
            document.getElementById(
                "announce-title"
            )?.value || "",

        category:
            document.getElementById(
                "announce-category"
            )?.value || "",

        quantity:
            parseInt(
                document.getElementById(
                    "announce-quantity"
                )?.value,
                10
            ) || 1,

        condition:
            document.getElementById(
                "announce-condition"
            )?.value || "",

        patrimony:
            document.getElementById(
                "announce-patrimony"
            )?.value || "S/N",

        description:
            document.getElementById(
                "announce-description"
            )?.value || "",

        school:
            document.getElementById(
                "announce-school"
            )?.value || "",

        location:
            document.getElementById(
                "announce-location"
            )?.value || "",

        contactPerson:
            document.getElementById(
                "announce-contact-person"
            )?.value || "",

        phone:
            document.getElementById(
                "announce-phone"
            )?.value || "",

        status:
            "Disponível",

        image:
            selectedImageBase64 || ""
    };


    try {

        const response =
            await fetch(API_URL, {
                method: "POST",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body:
                    JSON.stringify(newItem)
            });


        const responseText =
            await response.text();


        let result;


        try {

            result =
                JSON.parse(responseText);

        } catch (parseError) {

            throw new Error(
                "A API retornou uma resposta inválida."
            );
        }


        if (
            !response.ok ||
            result.result !== "success"
        ) {

            throw new Error(
                result.error ||
                "Não foi possível publicar o item."
            );
        }


        alert(
            "✅ Item publicado com sucesso!"
        );


        const form =
            document.getElementById(
                "form-announce"
            );


        if (form) {
            form.reset();
        }


        selectedImageBase64 = "";


        switchTab("catalog");


        setTimeout(
            loadFromGoogleSheets,
            1500
        );


    } catch (error) {

        console.error(
            "Erro ao publicar item:",
            error
        );


        alert(
            "❌ Erro ao salvar item.\n\n" +
            error.message
        );


    } finally {

        submitBtn.disabled = false;

        submitBtn.innerHTML =
            `<i class="fa-solid fa-paper-plane"></i> Publicar no Balcão`;
    }
}


/* ==========================================================================
   CARREGAMENTO DAS SOLICITAÇÕES
   ========================================================================== */

async function loadRequestsFromGoogleSheets() {

    const tbody =
        document.getElementById(
            "requests-table-body"
        );

    const badgeEl =
        document.getElementById(
            "requests-badge-count"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = `
        <tr>
            <td
                colspan="6"
                style="
                    text-align:center;
                    color:#64748b;
                    padding:2rem;
                "
            >
                <i class="fa-solid fa-circle-notch fa-spin"></i>
                Carregando solicitações...
            </td>
        </tr>
    `;


    try {

        const response =
            await fetch(
                `${API_URL}?action=getRequests&_=${Date.now()}`
            );


        if (!response.ok) {

            throw new Error(
                "Erro ao consultar a API."
            );
        }


        const data =
            await response.json();


        if (!Array.isArray(data)) {

            throw new Error(
                "A API retornou dados inválidos."
            );
        }


        allRequests =
            data;


        populateRequestSchoolFilters();

        applyRequestFilters();


    } catch (error) {

        console.error(
            "Erro ao carregar solicitações:",
            error
        );


        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="
                        text-align:center;
                        color:#dc2626;
                        padding:2rem;
                    "
                >
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
   FILTROS DAS SOLICITAÇÕES
   ========================================================================== */

function applyRequestFilters() {

    const search =
        (
            document.getElementById(
                "request-search"
            )?.value || ""
        )
            .trim()
            .toLowerCase();


    const status =
        (
            document.getElementById(
                "request-filter-status"
            )?.value || ""
        )
            .trim();


    const requesterSchool =
        (
            document.getElementById(
                "request-filter-requester-school"
            )?.value || ""
        )
            .trim();


    const donorSchool =
        (
            document.getElementById(
                "request-filter-donor-school"
            )?.value || ""
        )
            .trim();


    const startDate =
        (
            document.getElementById(
                "request-date-start"
            )?.value || ""
        )
            .trim();


    const endDate =
        (
            document.getElementById(
                "request-date-end"
            )?.value || ""
        )
            .trim();


    const filteredRequests =
        allRequests.filter(req => {


            /* --------------------------------------------------------------
               PESQUISA
               -------------------------------------------------------------- */

            const searchText = [
                req.itemTitle,
                req.patrimony,
                req.requesterSchool,
                req.donorSchool
            ]
                .map(value =>
                    String(value || "").toLowerCase()
                )
                .join(" ");


            const matchesSearch =
                !search ||
                searchText.includes(search);

            /* --------------------------------------------------------------
               STATUS
               -------------------------------------------------------------- */

            const matchesStatus =
                !status ||
                String(req.status || "").trim() === status;

            /* --------------------------------------------------------------
               ESCOLA SOLICITANTE
               -------------------------------------------------------------- */

            const matchesRequesterSchool =
                !requesterSchool ||
                String(
                    req.requesterSchool || ""
                ).trim() === requesterSchool;


            /* --------------------------------------------------------------
               ESCOLA DOADORA
               -------------------------------------------------------------- */

            const matchesDonorSchool =
                !donorSchool ||
                String(
                    req.donorSchool || ""
                ).trim() === donorSchool;


            /* --------------------------------------------------------------
               DATAS
               -------------------------------------------------------------- */

            let matchesStartDate = true;
            let matchesEndDate = true;


            if (startDate || endDate) {

                const requestDate =
                    parseRequestDate(req.date);


                if (!requestDate) {
                    return false;
                }


                requestDate.setHours(
                    0,
                    0,
                    0,
                    0
                );


                if (startDate) {

                    const start =
                        new Date(
                            startDate + "T00:00:00"
                        );


                    if (requestDate < start) {
                        matchesStartDate = false;
                    }
                }


                if (endDate) {

                    const end =
                        new Date(
                            endDate + "T23:59:59"
                        );


                    if (requestDate > end) {
                        matchesEndDate = false;
                    }
                }
            }


            return (
                matchesSearch &&
                matchesStatus &&
                matchesRequesterSchool &&
                matchesDonorSchool &&
                matchesStartDate &&
                matchesEndDate
            );
        });


    renderRequestsTable(
        filteredRequests
    );
}


function parseRequestDate(dateValue) {

    if (!dateValue) {
        return null;
    }


    const date =
        new Date(dateValue);


    if (isNaN(date.getTime())) {
        return null;
    }


    return date;
}


/* ==========================================================================
   PREENCHIMENTO DOS FILTROS DE ESCOLA
   ========================================================================== */

function populateRequestSchoolFilters() {

    const requesterSelect =
        document.getElementById(
            "request-filter-requester-school"
        );


    const donorSelect =
        document.getElementById(
            "request-filter-donor-school"
        );


    if (!requesterSelect || !donorSelect) {
        return;
    }


    const requesterSchools = [
        ...new Set(

            allRequests
                .map(req =>
                    String(
                        req.requesterSchool || ""
                    ).trim()
                )
                .filter(Boolean)
        )

    ]
        .sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "pt-BR"
                )
        );


    const donorSchools = [
        ...new Set(

            allRequests
                .map(req =>
                    String(
                        req.donorSchool || ""
                    ).trim()
                )
                .filter(Boolean)
        )

    ]
        .sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "pt-BR"
                )
        );


    /* ----------------------------------------------------------------------
       Escola solicitante
       ---------------------------------------------------------------------- */

    const currentRequesterValue =
        requesterSelect.value;


    requesterSelect.innerHTML = `
        <option value="">
            Todas as escolas
        </option>
    `;


    requesterSchools.forEach(school => {

        const option =
            document.createElement("option");


        option.value =
            school;


        option.textContent =
            school;


        requesterSelect.appendChild(
            option
        );
    });


    // Mantém seleção anterior quando possível
    if (
        requesterSchools.includes(
            currentRequesterValue
        )
    ) {

        requesterSelect.value =
            currentRequesterValue;
    }


    /* ----------------------------------------------------------------------
       Escola doadora
       ---------------------------------------------------------------------- */

    const currentDonorValue =
        donorSelect.value;


    donorSelect.innerHTML = `
        <option value="">
            Todas as escolas
        </option>
    `;


    donorSchools.forEach(school => {

        const option =
            document.createElement("option");


        option.value =
            school;


        option.textContent =
            school;


        donorSelect.appendChild(
            option
        );
    });


    if (
        donorSchools.includes(
            currentDonorValue
        )
    ) {

        donorSelect.value =
            currentDonorValue;
    }
}


/* ==========================================================================
   CONFIGURAÇÃO DOS FILTROS
   ========================================================================== */

function setupRequestFilters() {

    const filterIds = [

        "request-search",

        "request-filter-status",

        "request-filter-requester-school",

        "request-filter-donor-school",

        "request-date-start",

        "request-date-end"
    ];


    filterIds.forEach(id => {

        const element =
            document.getElementById(id);


        if (!element) {
            return;
        }


        const eventType =
            element.tagName === "INPUT"
                ? "input"
                : "change";


        element.addEventListener(
            eventType,
            applyRequestFilters
        );
    });


    const clearButton =
        document.getElementById(
            "btn-clear-request-filters"
        );


    if (clearButton) {

        clearButton.addEventListener(
            "click",
            clearRequestFilters
        );
    }
}


/* ==========================================================================
   LIMPAR FILTROS DAS SOLICITAÇÕES
   ========================================================================== */

function clearRequestFilters() {

    const search =
        document.getElementById(
            "request-search"
        );


    const status =
        document.getElementById(
            "request-filter-status"
        );


    const requesterSchool =
        document.getElementById(
            "request-filter-requester-school"
        );


    const donorSchool =
        document.getElementById(
            "request-filter-donor-school"
        );


    const startDate =
        document.getElementById(
            "request-date-start"
        );


    const endDate =
        document.getElementById(
            "request-date-end"
        );


    if (search) {
        search.value = "";
    }


    if (status) {
        status.value = "";
    }


    if (requesterSchool) {
        requesterSchool.value = "";
    }


    if (donorSchool) {
        donorSchool.value = "";
    }


    if (startDate) {
        startDate.value = "";
    }


    if (endDate) {
        endDate.value = "";
    }


    applyRequestFilters();
}


/* ==========================================================================
   RENDERIZAÇÃO DA TABELA DE SOLICITAÇÕES
   ========================================================================== */

function renderRequestsTable(
    requestsToRender = null
) {

    const tbody =
        document.getElementById(
            "requests-table-body"
        );


    const badgeEl =
        document.getElementById(
            "requests-badge-count"
        );


    if (!tbody) {
        return;
    }


    const requests =
        Array.isArray(requestsToRender)
            ? requestsToRender
            : (
                Array.isArray(allRequests)
                    ? allRequests
                    : []
            );


    /* ----------------------------------------------------------------------
       CONTADOR DE PENDÊNCIAS
       Usa todas as solicitações, não apenas as filtradas.
       ---------------------------------------------------------------------- */

    if (badgeEl) {

        const pendingCount =
            allRequests.filter(
                r =>
                    String(
                        r.status || ""
                    ).toLowerCase() === "pendente"
            ).length;


        badgeEl.textContent =
            pendingCount;
    }


    /* ----------------------------------------------------------------------
       CONTADOR DA LISTAGEM
       ---------------------------------------------------------------------- */

    const requestFilterCounter =
        document.getElementById(
            "request-filter-counter"
        );


    if (requestFilterCounter) {

        requestFilterCounter.textContent =
            `Mostrando ${requests.length} solicitação(ões)`;
    }


    tbody.innerHTML = "";


    /* ----------------------------------------------------------------------
       NENHUM RESULTADO
       ---------------------------------------------------------------------- */

    if (requests.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    style="
                        text-align:center;
                        color:#64748b;
                        padding:2rem;
                    "
                >
                    Nenhuma solicitação encontrada.
                </td>
            </tr>
        `;

        return;
    }


    /* ----------------------------------------------------------------------
       ORDENAÇÃO - MAIS RECENTES PRIMEIRO
       ---------------------------------------------------------------------- */

    const orderedRequests =
        [...requests].reverse();


    orderedRequests.forEach(req => {

        const tr =
            document.createElement("tr");


        const status =
            req.status || "Pendente";


        const statusClass =
            getRequestStatusClass(
                status
            );


        const qtyText =
            req.requestedQuantity
                ? ` (Qtd: ${req.requestedQuantity})`
                : "";


        tr.innerHTML = `
            <td>

                <div class="item-main-title">
                    ${req.itemTitle || "Item não informado"}${qtyText}
                </div>

                <div class="item-sub-patrimony">
                    Tombo: ${req.patrimony || "S/N"}
                </div>

            </td>


            <td>

                <div class="school-main-title">
                    ${req.requesterSchool || "Não informado"}
                </div>

                <div class="school-sub-contact">
                    ${req.requesterResponsible || ""}
                </div>

            </td>


            <td>
                ${req.donorSchool || "Não informado"}
            </td>


            <td>
                ${formatRequestDate(req.date)}
            </td>


            <td>

                <span class="status-pill ${statusClass}">
                    ${status}
                </span>

            </td>


            <td>

                <button
                    type="button"
                    class="btn-request-details"
                    title="Ver detalhes da solicitação"
                >
                    <i class="fa-solid fa-eye"></i>
                    Ver detalhes
                </button>

            </td>
        `;


        tbody.appendChild(tr);


        const detailsButton =
            tr.querySelector(
                ".btn-request-details"
            );


        if (detailsButton) {

            detailsButton.addEventListener(
                "click",
                () => {
                    openRequestDetails(
                        req.id
                    );
                }
            );
        }

    });
}


/* ==========================================================================
   DETALHES DA SOLICITAÇÃO
   ========================================================================== */

function openRequestDetails(
    requestId
) {

    const request =
        allRequests.find(
            req =>
                String(
                    req.id || ""
                ) === String(
                    requestId || ""
                )
        );


    if (!request) {

        alert(
            "Não foi possível localizar a solicitação."
        );

        return;
    }


    const setText =
        (
            id,
            value,
            fallback = "--"
        ) => {

            const element =
                document.getElementById(id);


            if (element) {

                element.textContent =
                    value ||
                    fallback;
            }
        };


    /* ----------------------------------------------------------------------
       DADOS DO BEM
       ---------------------------------------------------------------------- */

    setText(
        "request-detail-item",
        request.itemTitle
    );


    setText(
        "request-detail-patrimony",
        request.patrimony,
        "S/N"
    );


    setText(
        "request-detail-donor-school",
        request.donorSchool,
        "Não informado"
    );


    setText(
        "request-detail-quantity",
        request.requestedQuantity,
        "0"
    );


    /* ----------------------------------------------------------------------
       DADOS DA SOLICITAÇÃO
       ---------------------------------------------------------------------- */

    setText(
        "request-detail-requester-school",
        request.requesterSchool,
        "Não informado"
    );


    setText(
        "request-detail-requester-responsible",
        request.requesterResponsible,
        "Não informado"
    );


    setText(
        "request-detail-date",
        formatRequestDate(request.date)
    );


    setText(
        "request-detail-justification",
        request.justification,
        "Nenhuma justificativa informada."
    );


    /* ----------------------------------------------------------------------
       STATUS
       ---------------------------------------------------------------------- */

    const statusElement =
        document.getElementById(
            "request-detail-status"
        );


    if (statusElement) {

        const status =
            request.status ||
            "Pendente";


        statusElement.textContent =
            status;


        statusElement.className =
            "status-pill " +
            getRequestStatusClass(
                status
            );
    }


    /* ----------------------------------------------------------------------
       DADOS DA ANÁLISE
       ---------------------------------------------------------------------- */

    setText(
        "request-detail-analysis-date",
        request.analysisDate
            ? formatRequestDate(
                request.analysisDate
            )
            : "--"
    );


    setText(
        "request-detail-analysis-responsible",
        request.analysisResponsible,
        "Não informado"
    );


    /* ----------------------------------------------------------------------
       DATA DA TRANSFERÊNCIA
       ---------------------------------------------------------------------- */

    setText(
        "request-detail-transfer-date",
        request.transferDate
            ? formatRequestDate(
                request.transferDate
            )
            : "--"
    );


    /* ----------------------------------------------------------------------
       OBSERVAÇÃO / PARE
       ---------------------------------------------------------------------- */

    setText(
        "request-detail-analysis-observation",
        request.analysisObservation,
        "Nenhuma observação registrada."
    );


    /* ----------------------------------------------------------------------
       ABRE O MODAL
       ---------------------------------------------------------------------- */

    const modal =
        document.getElementById(
            "modal-request-details"
        );


    if (modal) {

        modal.classList.add(
            "active"
        );
    }
}


function closeRequestDetails() {

    const modal =
        document.getElementById(
            "modal-request-details"
        );


    if (modal) {

        modal.classList.remove(
            "active"
        );
    }
}


/* ==========================================================================
   CLASSES DOS STATUS
   ========================================================================== */

function getRequestStatusClass(
    status
) {

    switch (
        String(status || "").trim()
    ) {

        case "Pendente":
            return "pendente";


        case "Em análise":
            return "em-analise";


        case "Aprovada":
            return "aprovada";


        case "Recusada":
            return "recusada";


        case "Transferida":
            return "transferida";


        default:
            return "pendente";
    }
}


/* ==========================================================================
   FORMATAÇÃO DE DATAS
   ========================================================================== */

function formatRequestDate(
    dateValue
) {

    if (!dateValue) {
        return "--";
    }


    const date =
        new Date(dateValue);


    if (isNaN(date.getTime())) {

        return String(
            dateValue
        );
    }


    return date.toLocaleDateString(
        "pt-BR"
    );
}
