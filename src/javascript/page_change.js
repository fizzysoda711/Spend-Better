import { updateBudgetBar } from "./dashboard_page.js";

function showPage(pageClass) {
    document.querySelectorAll(".page").forEach(function (page) {
      page.classList.add("hidden");
    });

    document.querySelector(pageClass).classList.remove("hidden");
}

export function setupPageChangeButtons() {
    document.querySelector(".home-button").addEventListener("click", function () {
        showPage(".home-page");
        updateBudgetBar();
    });

    document.querySelector(".categories-button").addEventListener("click", function () {
        showPage(".categories-page");
    });

    document.querySelector(".savings-button").addEventListener("click", function () {
        showPage(".savings-page");
    });

    document.querySelector(".expenses-button").addEventListener("click", function () {
        showPage(".expenses-page");
    });

    document.querySelector(".settings-button").addEventListener("click", function () {
        showPage(".settings-page");
    });
}