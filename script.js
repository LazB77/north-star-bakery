"use strict";

const ORDER_STORAGE_KEY = "northStarBakeryOrder";

const menuItems = [
    { id: "signature-loaf", name: "Signature Artisan Loaf", price: 10 },
    { id: "pastry-box", name: "Assorted Pastry Box", price: 18 },
    { id: "celebration-cake", name: "Celebration Cake Deposit", price: 35 }
];

const orderState = {
    items: [],
    restored: false
};

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(amount);
}

function loadOrder() {
    try {
        const savedOrder = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY));
        if (savedOrder && Array.isArray(savedOrder.items)) {
            orderState.items = savedOrder.items;
            orderState.restored = orderState.items.length > 0;
        }
    } catch (error) {
        localStorage.removeItem(ORDER_STORAGE_KEY);
    }
}

function saveOrder() {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify({
        items: orderState.items,
        savedAt: new Date().toISOString()
    }));
}

function renderMenuOptions() {
    const optionsContainer = document.querySelector("#order-options");
    if (!optionsContainer) return;

    optionsContainer.innerHTML = menuItems.map((item) => {
        const savedItem = orderState.items.find((entry) => entry.id === item.id);
        const quantity = savedItem ? savedItem.quantity : 1;
        const checked = savedItem ? "checked" : "";
        const disabled = savedItem ? "" : "disabled";

        return `
            <article class="order-card">
                <h3>${item.name}</h3>
                <p>${formatCurrency(item.price)} each</p>
                <label>
                    <input type="checkbox" class="item-choice" data-item-id="${item.id}" ${checked}>
                    Add to order
                </label>
                <label for="quantity-${item.id}">Quantity</label>
                <input id="quantity-${item.id}" class="item-quantity" data-item-id="${item.id}"
                    type="number" min="1" max="12" value="${quantity}" ${disabled}>
            </article>`;
    }).join("");
}

function updateOrderFromControls() {
    orderState.items = menuItems.flatMap((item) => {
        const choice = document.querySelector(`.item-choice[data-item-id="${item.id}"]`);
        const quantityInput = document.querySelector(`.item-quantity[data-item-id="${item.id}"]`);
        if (!choice || !choice.checked) return [];

        const quantity = Math.min(12, Math.max(1, Number(quantityInput.value) || 1));
        quantityInput.value = quantity;
        return [{ id: item.id, name: item.name, price: item.price, quantity }];
    });

    saveOrder();
    renderOrderSummary(false);
}

function renderOrderSummary(restored) {
    const summaryList = document.querySelector("#order-summary-list");
    const totalElement = document.querySelector("#order-total");
    const statusElement = document.querySelector("#order-save-status");
    if (!summaryList || !totalElement || !statusElement) return;

    if (orderState.items.length === 0) {
        summaryList.innerHTML = "<li>No items selected yet.</li>";
        totalElement.textContent = formatCurrency(0);
        statusElement.textContent = "Selections save automatically on this device.";
        return;
    }

    summaryList.innerHTML = orderState.items.map((item) =>
        `<li>${item.quantity} × ${item.name} — ${formatCurrency(item.price * item.quantity)}</li>`
    ).join("");

    const total = orderState.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    totalElement.textContent = formatCurrency(total);
    statusElement.textContent = restored
        ? "Saved order restored from this browser."
        : "Order updated and saved in this browser.";
}

function handleOrderControls(event) {
    const itemId = event.target.dataset.itemId;
    if (!itemId) return;

    if (event.target.classList.contains("item-choice")) {
        const quantityInput = document.querySelector(`.item-quantity[data-item-id="${itemId}"]`);
        quantityInput.disabled = !event.target.checked;
    }
    updateOrderFromControls();
}

function clearSavedOrder() {
    orderState.items = [];
    localStorage.removeItem(ORDER_STORAGE_KEY);
    renderMenuOptions();
    attachOrderListeners();
    renderOrderSummary(false);
}

function attachOrderListeners() {
    document.querySelectorAll(".item-choice, .item-quantity").forEach((control) => {
        control.addEventListener("change", handleOrderControls);
    });
}

function initializeOrderBuilder() {
    if (!document.querySelector("#order-options")) return;
    loadOrder();
    renderMenuOptions();
    attachOrderListeners();
    renderOrderSummary(orderState.restored);
    document.querySelector("#clear-order").addEventListener("click", clearSavedOrder);
}

function setFieldError(field, message) {
    const errorElement = document.querySelector(`#${field.id}-error`);
    if (errorElement) errorElement.textContent = message;
    field.classList.toggle("invalid-field", Boolean(message));
    field.setAttribute("aria-invalid", message ? "true" : "false");
}

function validateForm(form) {
    let isValid = true;
    const name = form.elements.name;
    const email = form.elements.email;
    const pickupDate = form.elements["pickup-date"];
    const details = form.elements["item-details"];
    const requestType = form.querySelector('input[name="request-type"]:checked');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const checks = [
        { field: name, message: name.value.trim().length < 2 ? "Enter at least two characters for your name." : "" },
        { field: email, message: !emailPattern.test(email.value.trim()) ? "Enter a valid email address, such as name@example.com." : "" },
        { field: pickupDate, message: !pickupDate.value ? "Choose a requested pickup date." : "" },
        { field: details, message: details.value.trim().length < 10 ? "Provide at least 10 characters describing your request." : "" }
    ];

    checks.forEach(({ field, message }) => {
        setFieldError(field, message);
        if (message) isValid = false;
    });

    const requestError = document.querySelector("#request-type-error");
    requestError.textContent = requestType ? "" : "Choose either Pre-order or General question.";
    if (!requestType) isValid = false;

    return isValid;
}

function restoreOrderToForm() {
    const form = document.querySelector("#preorder-form");
    if (!form) return;

    loadOrder();
    if (orderState.items.length === 0) return;

    const details = orderState.items.map((item) => `${item.quantity} × ${item.name}`).join(", ");
    form.elements["item-details"].value = `Saved bakery order: ${details}`;
    form.elements["request-type"].value = "pre-order";
    const note = document.querySelector("#saved-order-note");
    note.textContent = "Your saved order was restored from the Products page.";
    note.hidden = false;
}

function initializeFormValidation() {
    const form = document.querySelector("#preorder-form");
    if (!form) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    form.elements["pickup-date"].min = tomorrow.toISOString().split("T")[0];
    restoreOrderToForm();

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const status = document.querySelector("#form-status");
        status.hidden = true;
        if (!validateForm(form)) {
            const firstInvalid = form.querySelector(".invalid-field");
            if (firstInvalid) firstInvalid.focus();
            return;
        }
        status.hidden = false;
    });

    form.addEventListener("input", (event) => {
        if (event.target.id && document.querySelector(`#${event.target.id}-error`)) {
            setFieldError(event.target, "");
        }
    });
}

initializeOrderBuilder();
initializeFormValidation();
