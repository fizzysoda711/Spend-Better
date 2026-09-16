// import invoke (to call rust functions from js)
const invoke = window.__TAURI__.core.invoke;

// imports from other js files
import 
{ 
    showLoadingScreen, 
    hideLoadingScreen, 
    getDate,
    showToast
} 
from "./helpers.js";

import { getDropdownCategories } from "./expenditures_page.js"

import { loadAllGraphics } from "./graphics.js";

// CATEGORIES PAGE-SPECIFIC HELPERS

// clear and close new category creating input fields
function closeNewCategoryPopup() {
    document.querySelector(".make-new-category-popup").classList.add("hidden");
    document.querySelector(".make-new-category-error-message").classList.add("hidden");
    document.querySelector(".new-category-button").classList.remove("hidden");

    document.querySelector(".make-new-category-name-input").value = "";
    document.querySelector(".make-new-category-budget-input").value = "";
    document.querySelector(".make-new-category-color-input").value = "#000000";

    document.querySelector(".make-new-category-error-message").classList.add("hidden");
}

// clear and close all category options menu stuff
function closeCategoriesOptionsMenu(box)
{
    // menu variables
    const optionsMenuButton = box.querySelector(".category-box-options-button");
    const optionsMenu = box.querySelector(".category-box-options-menu");

    // edit category variables
    const optionsMenuEditButton = box.querySelector(".category-box-edit-button");
    const optionsMenuEdit = box.querySelector(".category-box-options-menu-edit");

    const editMenuNameInput = box.querySelector(".edit-category-name-input");
    const editMenuBudgetInput = box.querySelector(".edit-category-budget-input");
    const editMenuColorInput = box.querySelector(".edit-category-color-input");

    // archive category variables
    const optionsMenuArchiveButton = box.querySelector(".category-box-archive-button");
    const optionsMenuArchive = box.querySelector(".category-box-options-menu-archive");

    // delete category variables
    const optionsMenuDeleteButton = box.querySelector(".category-box-delete-button");
    const optionsMenuDelete = box.querySelector(".category-box-options-menu-delete");
    
    // hide all the menu stuff
    optionsMenu.classList.add("hidden");
    optionsMenuEdit.classList.add("hidden");
    optionsMenuArchive.classList.add("hidden");
    optionsMenuDelete.classList.add("hidden");
    optionsMenuButton.classList.remove("hidden");

    // reset edit menu values to default
    editMenuNameInput.value = editMenuNameInput.defaultValue;
    editMenuBudgetInput.value = editMenuBudgetInput.defaultValue;
    editMenuColorInput.value = editMenuColorInput.defaultValue;
}

// update total budget amount
export async function updateTotalBudgetAmount()
{
    let totalBudgetText = document.querySelector('.categories-pie-chart-total');
    let totalBudget = await invoke("get_total_budget");
    totalBudgetText.textContent = `Total Budget: $${(totalBudget / 100).toFixed(2)}`;
}


// pressing add category button
document.querySelector(".new-category-button").addEventListener("click", function () 
{
    document.querySelector(".make-new-category-popup").classList.remove("hidden");
    document.querySelector(".new-category-button").classList.add("hidden");
});

// budget inputs should only allow two decimal places and no letters
const budgetInput = document.querySelector(".make-new-category-budget-input");
budgetInput.addEventListener("input", function () {
    let digits = budgetInput.value.replace(/\D/g, "");

    let cents = Number(digits);

    budgetInput.value = (cents / 100).toFixed(2);
});


// pressing the cancel button on the making a new category popup
document.querySelector(".cancel-new-category-button").addEventListener("click", function () 
{
    closeNewCategoryPopup();
});


// pressing the save button after making a new category
document.querySelector(".save-new-category-button").addEventListener("click", async function () 
{
    // save the values from input fields
    let catName = document.querySelector(".make-new-category-name-input").value;
    let catColor = document.querySelector(".make-new-category-color-input").value;
    let catBudget = document.querySelector(".make-new-category-budget-input").value;
    
    // check that all three fields are filled out
    if (catName === "" || catColor === "") 
    {
        document.querySelector(".make-new-category-error-message").textContent = "Please fill out color and category name.";
        document.querySelector(".make-new-category-error-message").classList.remove("hidden");
        return;
    }

    // get the date
    let currentDate = getDate();

    // create javascript object
    let newCategory =
    {
        name: catName,
        color: catColor,
        budget: catBudget == "" ? null : Math.round(Number(catBudget) * 100),
        month: currentDate.M,
        year: currentDate.Y
    }
    console.log(newCategory);

    // show the loading screen
    showLoadingScreen("Saving category");


    try
    {
        // using a different rust function depending on if there's a budget or not
        if (newCategory.budget == null)
        {
            await invoke("add_category_without_budget", { category: newCategory});
            showToast("No budget set. Expenses will act as the budget.");
        }
        else
        {
            await invoke("add_category_and_budget", { category: newCategory});
        }
    
        // clear and close new category popup box
        closeNewCategoryPopup();
    }
    catch (error)
    {
        document.querySelector(".make-new-category-error-message").textContent = "Save failed: " + error;
        document.querySelector(".make-new-category-error-message").classList.remove("hidden");        
    }
    finally
    {
        hideLoadingScreen();
        loadCategories();
        getDropdownCategories(); // for expense creation
        loadAllGraphics();
        updateTotalBudgetAmount();
    }

});

// load categories
export async function loadCategories()
{
    const categories = await invoke("get_categories_and_budgets");

    const container = document.querySelector(".categories-list");
    container.innerHTML = "";

    categories.forEach(category => {
        const box = document.createElement("div");

        box.classList.add("category-box");

        box.innerHTML = 
        `
            <div class="category-box-color" style="background-color: ${category.color};"></div>
            <div class="category-box-content">
                <div class="category-box-name-and-edit">
                    <p class="category-box-name">${category.name}</p>
                    <div>
                        <button class="category-box-options-button">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="1"/>
                                <circle cx="19" cy="12" r="1"/>
                                <circle cx="5" cy="12" r="1"/>
                            </svg>
                        </button>

                        <div class="category-box-options">
                            <div class="category-box-options-menu column hidden">
                                <button class="category-box-options-menu-button category-box-edit-button">Edit</button>
                                <div class="category-box-options-menu-line horizontal-center"></div>
                                <button class="category-box-options-menu-button category-box-archive-button">Archive</button>
                                <div class="category-box-options-menu-line horizontal-center"></div>
                                <button class="category-box-options-menu-button category-box-delete-button">Delete</button>
                            </div>

                            <div class="category-box-options-menu-edit hidden">
                                <p class="category-box-options-menu-edit-text">Name: <input class="edit-category-name-input" type="text" value="${category.name}" maxLength="50"></p>
                                <p class="category-box-options-menu-edit-text">Budget: <input class="edit-category-budget-input" type="text" inputmode="numeric" value="${(category.budget / 100).toFixed(2)}"></p>
                                <p class="category-box-options-menu-edit-text">Color: <input class="edit-category-color-input" type="color" value="${category.color}"></p>
                                <button class="category-box-options-menu-edit-save horizontal-center">Save</button>
                            </div>

                            <div class="category-box-options-menu-archive hidden">
                            </div>

                            <div class="category-box-options-menu-delete hidden">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="category-box-budget">
                    <p class="category-box-budget-label">Budget: </p>
                    <p class="category-box-budget-number">
                        ${category.budget === null ? "No budget set" : `$${(category.budget / 100).toFixed(2)}`}
                    </p>
                </div>
            </div>
            
        `
        ;

        // general menu variables
        const optionsMenuButton = box.querySelector(".category-box-options-button");
        const optionsMenu = box.querySelector(".category-box-options-menu");

        // edit category variables
        const optionsMenuEditButton = box.querySelector(".category-box-edit-button");
        const optionsMenuEdit = box.querySelector(".category-box-options-menu-edit");

        const editMenuNameInput = box.querySelector(".edit-category-name-input");
        const editMenuBudgetInput = box.querySelector(".edit-category-budget-input");
        const editMenuColorInput = box.querySelector(".edit-category-color-input");
        const editMenuSaveButton = box.querySelector(".category-box-options-menu-edit-save");

        // archive category variables
        const optionsMenuArchiveButton = box.querySelector(".category-box-archive-button");
        const optionsMenuArchive = box.querySelector(".category-box-options-menu-archive");

        // delete category variables
        const optionsMenuDeleteButton = box.querySelector(".category-box-delete-button");
        const optionsMenuDelete = box.querySelector(".category-box-options-menu-delete");

        // functions for menu buttons

        // opens the options menu
        optionsMenuButton.addEventListener("click", () => {
            event.stopPropagation();

            document.querySelectorAll(".category-box-options-menu").forEach(function (menu) {
                menu.classList.add("hidden");
            });

            optionsMenu.classList.remove("hidden");
        });

        // opens the edit menu
        optionsMenuEditButton.addEventListener("click", () => {
            event.stopPropagation();

            optionsMenu.classList.add("hidden");
            optionsMenuEdit.classList.remove("hidden");
        });

        // don't close popup when clicking input fields
        editMenuNameInput.addEventListener("click", function (event) {
            event.stopPropagation();
        });
        editMenuBudgetInput.addEventListener("click", function (event) {
            event.stopPropagation();
        });
        editMenuColorInput.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        // when clicking save
        editMenuSaveButton.addEventListener("click", async function (event) {
            const editedCategory = {
                c_id: category.c_id,
                name: editMenuNameInput.value,
                budget: editMenuBudgetInput.value * 100,
                color: editMenuColorInput.value,
                month: getDate().M,
                year: getDate().Y
            };

            await invoke("change_category_and_budget", { category: editedCategory });
            await loadCategories();
            await loadAllGraphics();
            await updateTotalBudgetAmount();
        });

        // budget inputs should only allow two decimal places and no letters
        editMenuBudgetInput.addEventListener("input", function () {
            let digits = editMenuBudgetInput.value.replace(/\D/g, "");

            let cents = Number(digits);

            editMenuBudgetInput.value = (cents / 100).toFixed(2);
        });

        // when you click the archive category button
        optionsMenuArchiveButton.addEventListener("click", async function() {
            const categoryToArchive = {
                c_id: category.c_id,
                name: category.name,
                color: category.color,
            };

            await invoke("archive_category", { category: categoryToArchive });
            await loadCategories();
            await loadArchivedCategories();
            await loadAllGraphics();
            await updateTotalBudgetAmount();
        });

        // when you click the delete category button
        optionsMenuDeleteButton.addEventListener("click", async function() {
            const categoryToDelete = {
                c_id: category.c_id,
                name: category.name,
                color: category.color,
            };

            try 
            {
                await invoke("delete_category", { category: categoryToDelete });
                await loadCategories();
                await loadAllGraphics();
                await updateTotalBudgetAmount();
            }
            catch (error) 
            {
                showToast(error);
            }
        });

        // closes the options menu when anything is clicked on the screen
        document.addEventListener("click", async function () {
            closeCategoriesOptionsMenu(box);
        });

        container.appendChild(box);
    });
}

// show archived categories
document.querySelector(".archived-categories-dropdown-button").addEventListener("click", async function () 
{
    await loadArchivedCategories();
    document.querySelector(".archived-categories-list").classList.toggle("hidden");

    document.querySelector(".archived-categories-dropdown-button-icon-closed").classList.toggle("hidden");
    document.querySelector(".archived-categories-dropdown-button-icon-open").classList.toggle("hidden");

});

// load archived categories
export async function loadArchivedCategories()
{
    // checking if there's any archived categories
    const archivedCount = await invoke("count_archived_categories");

    if (archivedCount > 0)
    {
        document.querySelector(".archived-categories-dropdown-button").classList.remove("hidden");
        document.querySelector(".archived-categories-dropdown-button-text").textContent = "View Archived Categories (" + archivedCount + ")";
    }
    else
    {
        document.querySelector(".archived-categories-dropdown-button").classList.add("hidden");
    }

    const categories = await invoke("get_archived_categories_and_budgets");

    const container = document.querySelector(".archived-categories-list");
    container.innerHTML = "";

    categories.forEach(category => {
        const box = document.createElement("div");

        box.classList.add("category-box");

        box.innerHTML = 
        `
            <div class="category-box-color" style="background-color: ${category.color};"></div>
            <div class="category-box-content">
                <div class="category-box-name-and-edit">
                    <p class="category-box-name">${category.name}</p>
                    <div>
                        <button class="category-box-options-button">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="1"/>
                                <circle cx="19" cy="12" r="1"/>
                                <circle cx="5" cy="12" r="1"/>
                            </svg>
                        </button>

                        <div class="category-box-options">
                            <div class="category-box-options-menu column hidden">
                                <button class="category-box-options-menu-button category-box-edit-button">Edit</button>
                                <div class="category-box-options-menu-line horizontal-center"></div>
                                <button class="category-box-options-menu-button category-box-unarchive-button">Unarchive</button>
                                <div class="category-box-options-menu-line horizontal-center"></div>
                                <button class="category-box-options-menu-button category-box-delete-button">Delete</button>
                            </div>

                            <div class="category-box-options-menu-edit hidden">
                                <p class="category-box-options-menu-edit-text">Name: <input class="edit-category-name-input" type="text" value="${category.name}" maxLength="50"></p>
                                <p class="category-box-options-menu-edit-text">Budget: <input class="edit-category-budget-input" type="text" inputmode="numeric" value="${category.budget === null ? "" : (category.budget / 100).toFixed(2)}"></p>
                                <p class="category-box-options-menu-edit-text">Color: <input class="edit-category-color-input" type="color" value="${category.color}"></p>
                                <button class="category-box-options-menu-edit-save horizontal-center">Save</button>
                            </div>

                            <div class="category-box-options-menu-archive hidden">
                            </div>

                            <div class="category-box-options-menu-delete hidden">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="category-box-budget">
                    <p class="category-box-budget-label">Budget: </p>
                    <p class="category-box-budget-number">
                        ${category.budget === null ? "No budget set" : `$${(category.budget / 100).toFixed(2)}`}
                    </p>
                </div>
            </div>
            
        `
        ;

        // general menu variables
        const optionsMenuButton = box.querySelector(".category-box-options-button");
        const optionsMenu = box.querySelector(".category-box-options-menu");

        // edit category variables
        const optionsMenuEditButton = box.querySelector(".category-box-edit-button");
        const optionsMenuEdit = box.querySelector(".category-box-options-menu-edit");

        const editMenuNameInput = box.querySelector(".edit-category-name-input");
        const editMenuBudgetInput = box.querySelector(".edit-category-budget-input");
        const editMenuColorInput = box.querySelector(".edit-category-color-input");
        const editMenuSaveButton = box.querySelector(".category-box-options-menu-edit-save");

        // archive category variables
        const optionsMenuUnarchiveButton = box.querySelector(".category-box-unarchive-button");
        const optionsMenuArchive = box.querySelector(".category-box-options-menu-archive");

        // delete category variables
        const optionsMenuDeleteButton = box.querySelector(".category-box-delete-button");
        const optionsMenuDelete = box.querySelector(".category-box-options-menu-delete");

        // functions for menu buttons

        // opens the options menu
        optionsMenuButton.addEventListener("click", () => {
            event.stopPropagation();

            document.querySelectorAll(".category-box-options-menu").forEach(function (menu) {
                menu.classList.add("hidden");
            });

            optionsMenu.classList.remove("hidden");
        });

        // opens the edit menu
        optionsMenuEditButton.addEventListener("click", () => {
            event.stopPropagation();

            optionsMenu.classList.add("hidden");
            optionsMenuEdit.classList.remove("hidden");
        });

        // don't close popup when clicking input fields
        editMenuNameInput.addEventListener("click", function (event) {
            event.stopPropagation();
        });
        editMenuBudgetInput.addEventListener("click", function (event) {
            event.stopPropagation();
        });
        editMenuColorInput.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        // when clicking save
        editMenuSaveButton.addEventListener("click", async function (event) {
            const editedCategory = {
                c_id: category.c_id,
                name: editMenuNameInput.value,
                budget: editMenuBudgetInput.value * 100,
                color: editMenuColorInput.value,
                month: getDate().M,
                year: getDate().Y
            };

            await invoke("change_category_and_budget", { category: editedCategory });
            await loadCategories();
            await loadArchivedCategories();
        });

        // budget inputs should only allow two decimal places and no letters
        editMenuBudgetInput.addEventListener("input", function () {
            let digits = editMenuBudgetInput.value.replace(/\D/g, "");

            let cents = Number(digits);

            editMenuBudgetInput.value = (cents / 100).toFixed(2);
        });

        // when you click the unarchive category button
        optionsMenuUnarchiveButton.addEventListener("click", async function() {
            const change_archive = {
                c_id: category.c_id,
                name: category.name,
                color: category.color,
            };

            await invoke("unarchive_category", { category: change_archive });
            await loadCategories();
            await loadArchivedCategories();
            await loadAllGraphics();
            await updateTotalBudgetAmount();
        });

        // when you click the delete category button
        optionsMenuDeleteButton.addEventListener("click", async function() {
            const categoryToDelete = {
                c_id: category.c_id,
                name: category.name,
                color: category.color,
            };

            try 
            {
                await invoke("delete_category", { category: categoryToDelete });
                await loadArchivedCategories();
            }
            catch (error) 
            {
                showToast(error);
            }
        });

        // closes the options menu when anything is clicked on the screen
        document.addEventListener("click", async function () {
            closeCategoriesOptionsMenu(box);
        });

        container.appendChild(box);
    });
}

