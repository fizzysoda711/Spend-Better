import { updateBudgetBar } from "./dashboard_page.js";
import { updateTotalBudgetAmount } from "./categories_page.js";
import { getAmountSpentPerCategory } from "./expenditures_page.js";
import { loadBudgetsOverTime } from "./graphics.js";

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

    document.querySelector(".categories-button").addEventListener("click", async function () {
        showPage(".categories-page");
        updateTotalBudgetAmount();
        loadBudgetsOverTime();
    });

    document.querySelector(".savings-button").addEventListener("click", function () {
        showPage(".savings-page");
    });

    document.querySelector(".expenses-button").addEventListener("click", function () {
        showPage(".expenses-page");
        getAmountSpentPerCategory();
    });

    document.querySelector(".settings-button").addEventListener("click", function () {
        showPage(".settings-page");
    });
}