// import invoke (to call rust functions from js)
const invoke = window.__TAURI__.core.invoke;

// imports from other js files
import { loadAllGraphics } from "./graphics.js";

import { setupPageChangeButtons } from "./page_change.js";

import { updateDash, updateBudgetBar } from "./dashboard_page.js";

import { loadCategories, loadArchivedCategories } from "./categories_page.js";

import { loadExpenses, setSortingSelections, defaultExpenseFilters } from "./expenditures_page.js";

import "./expenditures_page.js";




// is it running?
console.log("main.js is running");


// run on start of the app
window.addEventListener("DOMContentLoaded", async () => {
    setupPageChangeButtons(); // setup clicker event for changing pages buttons
    try
    {
        await invoke("new_month_budget_transfer"); // make sure budgets are transfered to next month
        console.log("budget transfer done")
    }
    catch (error)
    {
        console.log("budget transfer failed:", error);
    }
    
    updateDash(); // update the dashboard in home
    loadCategories(); // load the categories
    loadArchivedCategories(); // load archived categories if any
    loadExpenses(defaultExpenseFilters); // load expenses
    setSortingSelections(defaultExpenseFilters); //
    loadAllGraphics(); // load all graphics

    setInterval(updateDash, 60000); // update the dashboard every minute
});