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

// ----- EXPENDITURES PAGE VARIABLES ----- //
let currentExpenseFilters = {
    isAllTime: false,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: null,
    categoryID: null,
    isAnyAmount: true,
    maxAmount: null,
    minAmount: null,
    isNoNoteOnly: false,
    sortBy: "date-new-first",
    note: []
}

export let defaultExpenseFilters = {
    isAllTime: false,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: null,
    categoryID: null,
    isAnyAmount: true,
    maxAmount: null,
    minAmount: null,
    isNoNoteOnly: false,
    sortBy: "date-new-first",
    note: []
}


// ----- EXPENDITURES PAGE SPECIFIC HELPERS ----- //

// to list categories in drowdown when creating an expenditure
export async function getDropdownCategories()
{
    const categories = await invoke("get_categories_and_budgets");
    const dropdownCategories = document.querySelector(".expense-input-categories-dropdown");

    dropdownCategories.innerHTML = `<option value="">Choose a category</option>`;
    
    categories.forEach(function (category) {
        // create a new option in the dropdown
        const option = document.createElement("option");

        // set the hidden value to reference later
        option.value = category.c_id;
        option.textContent = category.name;

        dropdownCategories.appendChild(option);
    });
}

// to list archived and unarchived categories for sorting expenses
export async function getSortingCategories()
{
    const dropdownCategories = document.querySelector(".expense-sorting-categories-dropdown");
    dropdownCategories.innerHTML = `<option value="all-categories">All Categories</option>`;
    
    // for non archived categories
    const categories = await invoke("get_categories_and_budgets");
    
    categories.forEach(function (category) {
        // create a new option in the dropdown
        const option = document.createElement("option");

        // set the hidden value to reference later
        option.value = category.c_id;
        option.textContent = category.name;

        dropdownCategories.appendChild(option);
    });

    // for archived categories
    const archivedCategories = await invoke("get_archived_categories_and_budgets");
    
    archivedCategories.forEach(function (category) {
        // create a new option in the dropdown
        const archivedOption = document.createElement("option");

        // set the hidden value to reference later
        archivedOption.value = category.c_id;
        archivedOption.textContent = category.name + " (archived)";

        dropdownCategories.appendChild(archivedOption);
    });
}

// to list archived and unarchived categories for editing expenses
export async function getEditingCategories(dropdown, box)
{
    // for non archived categories
    const categories = await invoke("get_categories_and_budgets");
    
    categories.forEach(function (category) {
        // create a new option in the dropdown
        const option = box.createElement("option");

        // set the hidden value to reference later
        option.value = category.c_id;
        option.textContent = category.name;

        dropdown.appendChild(option);
    });

    // for archived categories
    const archivedCategories = await invoke("get_archived_categories_and_budgets");
    
    archivedCategories.forEach(function (category) {
        // create a new option in the dropdown
        const archivedOption = box.createElement("option");

        // set the hidden value to reference later
        archivedOption.value = category.c_id;
        archivedOption.textContent = category.name + " (archived)";

        dropdown.appendChild(archivedOption);
    });
}

// close and reset new expenditure creation fields
async function closeNewExpensePopup()
{
    const newExpenseMenu = document.querySelector(".new-expense-inputs");
    const newExpenseDropdown = document.querySelector(".expense-input-categories-dropdown");
    const newExpenseAmount = document.querySelector(".new-expense-input-amount-input");
    const newExpenseDate = document.querySelector(".new-expense-input-date-input");
    const newExpenseNote = document.querySelector(".new-expense-input-note-input");

    newExpenseMenu.classList.add("hidden");

    newExpenseDropdown.value = "";
    newExpenseAmount.value = "";
    newExpenseDate.value = "";
    newExpenseNote.value = "";

    document.querySelector(".new-expense-button").classList.remove("hidden");
}

// get years for sorting menu date dropdowns
export async function getDropdownYears() // must run when expense is created, deleted, and when buttons are clicked that need it in sorting menu
{
    // variables for the 2 dropdowns and the current year
    const dropdownYears = document.querySelector(".expense-sorting-year-dropdown");
    const dropdownYearsForMonths = document.querySelector(".expense-sorting-year-for-month-dropdown");

    // delete everything currently in the dropdowns
    dropdownYears.innerHTML = "";
    dropdownYearsForMonths.innerHTML = "";

    // get the years
    const years = await invoke("get_expense_years");
    
    // checking if the current year is in the list for default selection
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear))
    {
        years.push(currentYear);
        years.sort((a, b) => b - a);
    }

    // adding the years to their dropdowns
    years.forEach(function (year) {
        // create an option for the year dropdown
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        dropdownYears.appendChild(option);

        // create a separate option for the month filter's year dropdown
        const monthOption = document.createElement("option");
        monthOption.value = year;
        monthOption.textContent = year;
        dropdownYearsForMonths.appendChild(monthOption);
    });
}

// get months for sorting menu date dropdowns
export async function getDropdownMonths(year) // must run when expense year is selected
{
    // variable for the months dropdown
    const dropdownMonths = document.querySelector(".expense-sorting-month-dropdown");

    // delete everything currently in the dropdown
    dropdownMonths.innerHTML = "";

    // get the months
    const months = await invoke("get_expense_months", {year: Number(year)});

    // make sure the current month is there only if the current year is selected
    if (year == new Date().getFullYear())
    {
        const currentMonth = new Date().getMonth() + 1;
        if (!months.includes(currentMonth))
        {
            months.push(currentMonth);
            months.sort((a, b) => b - a);
        }
    }

    // months come back in numbers so change them to names
    const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ];
    
    months.forEach(function (month) {

        // create an option for the months dropdown
        const option = document.createElement("option");
        option.value = month;
        option.textContent = monthNames[month - 1];
        dropdownMonths.appendChild(option);
    });
}

// add function to update sorting selections on save
export async function updateSortingSelections()
{
    // set all values to null/false
    currentExpenseFilters.isAllTime = false;
    currentExpenseFilters.year = null;
    currentExpenseFilters.month = null;
    currentExpenseFilters.day = null;
    currentExpenseFilters.categoryID = null;
    currentExpenseFilters.isAnyAmount = null;
    currentExpenseFilters.maxAmount = null;
    currentExpenseFilters.minAmount = null;
    currentExpenseFilters.isNoNoteOnly = false;
    currentExpenseFilters.sortBy = "";
    currentExpenseFilters.note = [];

    // add hidden to all expense sorting error messages
    let errorMessages = document.querySelectorAll(".expense-sorting-error-message");
    errorMessages.forEach(message => {
        message.classList.add("hidden");
    });

    // get relevant varaibles for sorting inputs
    const dateRadioValue = document.querySelector('input[name="expenses-sorting-filter-by-date"]:checked').value;
    const categoryDropdownValue = document.querySelector(".expense-sorting-categories-dropdown").value;
    const amountRadioValue = document.querySelector('input[name="expenses-sorting-filter-by-amount"]:checked').value;
    const minAmount = document.querySelector(".expense-sorting-min-amount").value; 
    const maxAmount = document.querySelector(".expense-sorting-max-amount").value;
    const keywords = document.querySelector(".sort-expenses-note").value;
    const isNoNoteOnly = document.querySelector('input[name="expenses-sorting-filter-by-note"]').checked;
    const ordering = document.querySelector('input[name="expenses-sorting-order-by"]:checked').value;

    // error messages
    const dateSortingError = document.querySelector(".expense-sorting-by-date-error-message");
    const amountSortingError = document.querySelector(".expense-sorting-by-amount-error-message");

    // date sorting
    if (dateRadioValue == "all-time-expenses") // all time expenses
    {
        currentExpenseFilters.isAllTime = true;
    }
    else if (dateRadioValue == "specific-year") // by year
    {
        let year = document.querySelector(".expense-sorting-year-dropdown").value;
        currentExpenseFilters.year = Number(year);
    }
    else if (dateRadioValue == "specific-month") // by month
    {
        let year = document.querySelector(".expense-sorting-year-for-month-dropdown").value;
        currentExpenseFilters.year = Number(year);

        let month = document.querySelector(".expense-sorting-month-dropdown").value;
        currentExpenseFilters.month = Number(month);
    }
    else if (dateRadioValue == "specific-day") // by day
    {
        const dateInput = document.querySelector(".expense-sorting-date").value;

        if (dateInput == "") // no date input
        {
            // use current date
            let today = new Date();

            let year = today.getFullYear();
            let month = today.getMonth() + 1;
            let day = today.getDate();

            currentExpenseFilters.year = year;
            currentExpenseFilters.month = month;
            currentExpenseFilters.day = day;
        }
        else
        {
            let [year, month, day] = dateInput.split("-").map(Number);

            currentExpenseFilters.year = year;
            currentExpenseFilters.month = month;
            currentExpenseFilters.day = day;
        }
    }

    // category sorting
    if (categoryDropdownValue != "")
    {
        currentExpenseFilters.categoryID = Number(categoryDropdownValue);
    }

    // amount sorting
    if (amountRadioValue == "all-amounts")
    {
        currentExpenseFilters.isAnyAmount = true;
    }
    else if (amountRadioValue == "specific-range")
    {
        // make sure at least one of the min or max has a value
        if (minAmount == "" && maxAmount == "")
        {
            amountSortingError.textContent = "Error: No min or max entered";
            amountSortingError.classList.remove("hidden");
        }
        else
        {
            if (minAmount != "")
            {
                currentExpenseFilters.minAmount = Math.round(Number(minAmount) * 100);
            }
            if (maxAmount != "")
            {
                currentExpenseFilters.maxAmount = Math.round(Number(maxAmount) * 100);
            }
        }
    }

    // note sorting
    if (isNoNoteOnly)
    {
        currentExpenseFilters.isNoNoteOnly = true;
    }
    else if (keywords.trim() != "")
    {   
        let keywordsList = keywords
            .split(",").map(keyword => keyword.trim().toLowerCase())
            .filter(keyword => keyword != "");
        currentExpenseFilters.note = keywordsList;
    }

    // ordering
    currentExpenseFilters.sortBy = ordering;
}

// set sorting selections on the ui
export async function setSortingSelections(expenseFilters)
{
    // set date selection
    if (expenseFilters.isAllTime == true) // all time
    {
        document.querySelector('input[name="expenses-sorting-filter-by-date"][value="all-time-expenses"]').checked = true;

        // close other menu options for other radio buttons
        document.querySelector('.sorting-selection-options-specific-year').classList.add('hidden');
        document.querySelector('.sorting-selection-options-specific-year-for-month').classList.add('hidden');
        document.querySelector('.sorting-selection-options-specific-month').classList.add('hidden');
        document.querySelector('.expense-sorting-date').classList.add('hidden');
    }
    else
    {
        if ((expenseFilters.year != null) && (expenseFilters.month == null) && (expenseFilters.day == null))
        {
            document.querySelector('input[name="expenses-sorting-filter-by-date"][value="specific-year"]').checked = true;

            document.querySelector('.sorting-selection-options-specific-year').classList.remove('hidden');
            document.querySelector('.sorting-selection-options-specific-year-for-month').classList.add('hidden');
            document.querySelector('.sorting-selection-options-specific-month').classList.add('hidden');
            document.querySelector('.expense-sorting-date').classList.add('hidden');

            document.querySelector('.expense-sorting-year-dropdown').value = expenseFilters.year;
        }
        else if ((expenseFilters.year != null) && (expenseFilters.month != null) && (expenseFilters.day == null))
        {
            document.querySelector('input[name="expenses-sorting-filter-by-date"][value="specific-month"]').checked = true;

            document.querySelector('.sorting-selection-options-specific-year').classList.add('hidden');
            console.log('hid year dropdown for year only');
            document.querySelector('.sorting-selection-options-specific-year-for-month').classList.remove('hidden');
            console.log('removed hidden from year dropdown for month only');
            document.querySelector('.sorting-selection-options-specific-month').classList.remove('hidden');
            console.log('removed hidden from month dropdown');
            document.querySelector('.expense-sorting-date').classList.add('hidden');


            try
            {
                document.querySelector('.expense-sorting-year-for-month-dropdown').value = expenseFilters.year;
                console.log('set year dropdown value');
            }
            finally
            {
                document.querySelector('.expense-sorting-month-dropdown').value = expenseFilters.month;
                console.log('set month dropdown value');
            }
        }
        else if ((expenseFilters.year != null) && (expenseFilters.month != null) && (expenseFilters.day != null)) // specific day
        {
            document.querySelector('input[name="expenses-sorting-filter-by-date"][value="specific-day"]').checked = true;
            
            const year = expenseFilters.year;
            const month = String(expenseFilters.month).padStart(2, '0');
            const day = String(expenseFilters.day).padStart(2, '0');

            const dateString = `${year}-${month}-${day}`;
            document.querySelector('.expense-sorting-date').value = dateString;

            document.querySelector('.sorting-selection-options-specific-year').classList.add('hidden');
            document.querySelector('.sorting-selection-options-specific-year-for-month').classList.add('hidden');
            document.querySelector('.sorting-selection-options-specific-month').classList.add('hidden');
            document.querySelector('.expense-sorting-date').classList.remove('hidden');
        }
    }

    // set category selection
    if (expenseFilters.categoryID == null)
    {
        document.querySelector('.expense-sorting-categories-dropdown').text = "All Categories";
    }
    else if (expenseFilters.categoryID != null)
    {
        document.querySelector('.expense-sorting-categories-dropdown').value = expenseFilters.categoryID;
    }

    // set expense selection
    if (expenseFilters.isAnyAmount == true)
    {
        document.querySelector('input[name="expenses-sorting-filter-by-amount"][value="all-amounts"]').checked = true;

        document.querySelector('.min-sorting-label').classList.add('hidden');
        document.querySelector('.max-sorting-label').classList.add('hidden');
    }
    else
    {
        document.querySelector('input[name="expenses-sorting-filter-by-amount"][value="specific-range"]').checked = true;

        if (expenseFilters.minAmount != null)
        {
            document.querySelector('.expense-sorting-min-amount').value = (expenseFilters.minAmount / 100).toFixed(2);
        }
        if (expenseFilters.maxAmount != null)
        {
            document.querySelector('.expense-sorting-max-amount').value = (expenseFilters.maxAmount / 100).toFixed(2);
        }

        document.querySelector('.min-sorting-label').classList.remove('hidden');
        document.querySelector('.max-sorting-label').classList.remove('hidden');
    }

    // set note selection
    if (expenseFilters.isNoNoteOnly == true)
    {
        document.querySelector('input[name="expenses-sorting-filter-by-note"][value="no-note"]').checked = true;
    }
    else
    {
        let noteText = ``;

        const listLength = (expenseFilters.note).length;

        (expenseFilters.note).forEach((item, index) => {
            if (index == listLength - 1)
            {
                noteText += `${item}`;
            }
            else
            {
                noteText += `${item}, `;
            }
        });

        document.querySelector('input[name="expenses-sorting-filter-by-note"][value="no-note"]').checked = false;
    }

    // set sorting selection
    let value = expenseFilters.sortBy;
    document.querySelector(`input[name="expenses-sorting-order-by"][value="${value}"]`).checked = true;
}

// load expenses based on current sorting selections
export async function loadExpenses(expenseFilters)
{
    const expenses = await invoke("get_expenses", {
        filters: expenseFilters
    });


    const container = document.querySelector(".expenses-list");
    container.innerHTML = "";

    expenses.forEach(expense => {
        const box = document.createElement("div");

        box.classList.add("expense-box");
        box.classList.add("column");

        box.innerHTML = 
        `
            <div class="expense-box-row-1 row vertical-center">
                <div class="expense-category-and-color row vertical-center">
                    <svg class="expense-category-color" viewBox="0 0 6 6" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="3px" cy="3px" r="3px" fill="${expense.color}" />
                    </svg>

                    <p class="expense-category"> ${expense.name} </p>
                </div>

                <button class="expense-note-visibility-button" title="View note">
                    <svg class="expense-note-not-visible-button-icon full-center hidden" title="View note" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/>
                        <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/>
                        <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/>
                        <path d="m2 2 20 20"/>
                    </svg>
                    <svg class="expense-note-visible-button-icon full-center" title="Hide note" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>

                <p class="expense-date"> ${expense.month}/${expense.day}/${expense.year} </p>

                <p class="expense-amount"> $${(expense.amount/100).toFixed(2)} </p>

                <div class="expense-options-box-wrapper">
                    <button class="expense-options">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="expense-options-icon vertical-center">
                            <circle cx="12" cy="12" r="1"/>
                            <circle cx="12" cy="5" r="1"/>
                            <circle cx="12" cy="19" r="1"/>
                        </svg>
                    </button>

                    <div class="expense-options-box hidden">
                        <div class="expense-options-main-menu row full-center">
                            <button class="expense-options-box-button expense-box-edit-button">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="expense-box-edit-icon">
                                    <path d="M13 21h8"/>
                                    <path d="m15 5 4 4"/>
                                    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
                                </svg>
                            </button>
                            <button class="expense-options-box-button expense-box-delete-button">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="expense-box-delete">
                                    <path d="M10 11v6"/>
                                    <path d="M14 11v6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                                    <path d="M3 6h18"/>
                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>

                        <div class="expense-options-editing-menu column hidden">
                            <div class="row vertical-center">
                                <select class="expense-editing-category-dropdown"></select>

                                <input class="expense-editing-amount" type="text" inputmode="numeric" placeholder="New amount">
                            </div>
                            <div class="row vertical-center">
                                <input class="expense-editing-date" type="date">

                                <input class="expense-editing-note" type="text" placeholder="Note">

                                <button class="save-expense-edit-button">
                                    <svg class="full-center" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 25 25" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M20 6 9 17l-5-5"/>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div class="delete-are-you-sure row vertical-center hidden">
                            <p class="delete-are-you-sure-message"> Delete this expense? </p>
                            <button class="confirm-delete-expense button"> Delete </button>
                            <button class="cancel-delete-expense button"> Cancel </button>
                        </div>
                    </div>
                </div>

            </div>
            <div class="expense-box-row-2 row vertical-center">
                <button class="expense-note">Note: ${expense.note}</button>
            </div>
        `
        ;

        container.appendChild(box);

        // expense note visibility handling
        const noteVisibilityButton = box.querySelector('.expense-note-visibility-button');
        const note = box.querySelector('.expense-note');

        if (expense.note == null)
        {   
            // hide second row, change the box height, and hide the note visibility button
            box.querySelector('.expense-box-row-2').classList.add('hidden');
            box.style.height = "30px";
            noteVisibilityButton.classList.add('invisible');
        }

        if (expense.note != null)
        {
            // hide the note (user can open if and when they want to)
            note.classList.add('hidden');
        }

        // make note visible or invisible with note visibility button
        noteVisibilityButton.addEventListener("click", async function() {
            if (note.classList.contains('hidden'))
            {
                // unhide the note and swap the icon
                note.classList.remove('hidden');
                box.querySelector('.expense-note-not-visible-button-icon').classList.remove('hidden');
                box.querySelector('.expense-note-visible-button-icon').classList.add('hidden');
                noteVisibilityButton.title = "Hide note";
            }
            else
            {
                // hide the note and swap the icon and change tooltip
                note.classList.add('hidden');
                box.querySelector('.expense-note-not-visible-button-icon').classList.add('hidden');
                box.querySelector('.expense-note-visible-button-icon').classList.remove('hidden');
                noteVisibilityButton.title = "View note";
            }
        });
        

        // expense options menu handling
        const openOptionsMenuButton = box.querySelector('.expense-options');
        const optionsMenuBox = box.querySelector('.expense-options-box');

        // opening the menu
        openOptionsMenuButton.addEventListener("click", () => {
            event.stopPropagation();

            document.querySelectorAll(".expense-options-box").forEach(function (menu) {
                menu.classList.add("hidden");
            });

            optionsMenuBox.classList.remove("hidden");

        });

        // editing menu inputs
        const amountEditor = box.querySelector('.expense-editing-amount');
        const dateEditor = box.querySelector('.expense-editing-date');
        const noteEditor = box.querySelector('.expense-editing-note');
        const dropdown = box.querySelector('.expense-editing-category-dropdown');

        // opening the editing menu
        const editingMenuButton = box.querySelector('.expense-box-edit-button');
        const editingMenu = box.querySelector('.expense-options-editing-menu')
        editingMenuButton.addEventListener("click", async function() {
            event.stopPropagation();

            // clear the dropdown
            dropdown.innerHTML = "";

            // make menu visible
            editingMenu.classList.remove('hidden');
            box.querySelector('.expense-options-main-menu').classList.add('hidden');

            // populate categories dropdown
            // for non archived categories
            const categories = await invoke("get_categories_and_budgets");
            categories.forEach(function (category) {
                // create a new option in the dropdown
                const option = document.createElement("option");

                // set the hidden value to reference later
                option.value = category.c_id;
                option.textContent = category.name;

                dropdown.appendChild(option);
            });

            // for archived categories
            const archivedCategories = await invoke("get_archived_categories_and_budgets");
            archivedCategories.forEach(function (category) {
                // create a new option in the dropdown
                const archivedOption = document.createElement("option");

                // set the hidden value to reference later
                archivedOption.value = category.c_id;
                archivedOption.textContent = category.name + " (archived)";

                dropdown.appendChild(archivedOption);
            });

            // set editing selections to the current values
            dropdown.value = expense.c_id;
            amountEditor.value = (expense.amount/100).toFixed(2);

            let dateEditorMonth = String(expense.month).padStart(2, "0");
            let dateEditorDay = String(expense.day).padStart(2, "0");
            dateEditor.value = `${expense.year}-${dateEditorMonth}-${dateEditorDay}`

            if (expense.note != "")
            {
                noteEditor.value = expense.note;
            }
        });

        // format amount input field
        amountEditor.addEventListener("input", function () {
            let digits = amountEditor.value.replace(/\D/g, "");

            let cents = Number(digits);

            amountEditor.value = (cents / 100).toFixed(2);
        });

        // clicking save when editing expense
        box.querySelector('.save-expense-edit-button').addEventListener("click", async function() {
            event.stopPropagation();

            const catid = dropdown.value;
            let amountInput = amountEditor.value;
            let dateInput = dateEditor.value;
            let noteInput = noteEditor.value;
        
            // amount has an input
            if (amountInput == "")
            {
                showToast("Amount cannot be empty");
            }

            // make varaibles for year, month, and day
            let yearInput;
            let monthInput;
            let dayInput;

            if (dateInput == "")
            {
                let date = getDate();
                yearInput = date.Y;
                monthInput = date.M;
                dayInput = date.D;
            }
            else
            {
                let date = dateInput.split("-");
                yearInput = Number(date[0]);
                monthInput = Number(date[1]);
                dayInput = Number(date[2]);
            }

            // to send to rust function
            let editedExpense =
            {
                e_id: expense.e_id,
                c_id: Number(catid),
                amount: Math.round(Number(amountInput) * 100), // database uses cents
                year: yearInput,
                month: monthInput,
                day: dayInput,
                note: noteInput.trim() == "" ? null : noteInput.trim()
            }

            try
            {
                await invoke("edit_expense", { expenses: editedExpense });
                getDropdownYears();
            }
            finally
            {
                box.querySelector('.expense-options-box').classList.add('hidden');
                editingMenu.classList.add('hidden');
                box.querySelector('.expense-options-main-menu').classList.remove('hidden');
                await loadExpenses(currentExpenseFilters);
            }
        });

        // deleting an expense
        box.querySelector('.expense-box-delete-button').addEventListener("click", function() {
            event.stopPropagation();

            // "are you sure" prompt
            box.querySelector('.delete-are-you-sure').classList.remove('hidden');
            box.querySelector('.expense-options-main-menu').classList.add('hidden');
        });

        box.querySelector('.confirm-delete-expense').addEventListener("click", async function() {
            event.stopPropagation();

            let expenseToDelete =
            {
                e_id: expense.e_id,
                amount: expense.amount, // database uses cents
            }

            console.log(expenseToDelete.amount);

            try
            {
                await invoke("delete_expense", { expense: expenseToDelete });
            }
            finally
            {
                editingMenu.classList.add('hidden');
                box.querySelector('.expense-options-box').classList.add('hidden');
                box.querySelector('.delete-are-you-sure').classList.add('hidden');
                box.querySelector('.expense-options-main-menu').classList.remove('hidden');

                loadExpenses(currentExpenseFilters);
            }
        });

        // preventing editing menu from closing when changing selections
        box.querySelector('.expense-editing-category-dropdown').addEventListener("click", function() {
            event.stopPropagation();
        });
        box.querySelector('.expense-editing-amount').addEventListener("click", function() {
            event.stopPropagation();
        });
        box.querySelector('.expense-editing-date').addEventListener("click", function() {
            event.stopPropagation();
        });
        box.querySelector('.expense-editing-note').addEventListener("click", function() {
            event.stopPropagation();
        });


        // closing expense options menu
        document.addEventListener("click", async function () {
            document.querySelectorAll(".expense-options-box").forEach(function (menu) {
                menu.classList.add("hidden");
            });

            // add hidden to edit menu and remove it from options menu
            editingMenu.classList.add('hidden');
            box.querySelector('.delete-are-you-sure').classList.add('hidden');
            box.querySelector('.expense-options-main-menu').classList.remove('hidden');

        });

    });

    console.log('expenses loaded')
}


// ----- EXPENDITURES PAGE SPECIFIC BEHAVIORS ----- //

// new expense button and input menu
document.querySelector(".new-expense-button").addEventListener("click", async function() {
    document.querySelector(".new-expense-inputs").classList.remove("hidden");
    document.querySelector(".new-expense-button").classList.add("hidden");

    await getDropdownCategories();

    document.querySelector('.expenses-sorting-section').classList.add('hidden');
    setSortingSelections(currentExpenseFilters);

    await document.querySelector(".new-expense-inputs").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
    document.querySelector(".expenses-list-whole").scrollBy({
        top: -100000,
        behavior: "smooth"
    })
});

// formatting for new expense amount input field
const amountInput = document.querySelector(".new-expense-input-amount-input");
amountInput.addEventListener("input", function () {
    let digits = amountInput.value.replace(/\D/g, "");

    let cents = Number(digits);

    amountInput.value = (cents / 100).toFixed(2);
});

// cancel making new expense
document.querySelector(".cancel-new-expense-button").addEventListener("click", async function() {
    await closeNewExpensePopup();

    document.querySelector(".new-expense-error-message").classList.add("hidden");
});

// saving new expense
document.querySelector(".save-new-expense-button").addEventListener("click", async function() {
    const catid = document.querySelector(".expense-input-categories-dropdown").value;
    let amountInput = document.querySelector(".new-expense-input-amount-input").value;
    let dateInput = document.querySelector(".new-expense-input-date-input").value;
    let noteInput = document.querySelector(".new-expense-input-note-input").value;
   
    // verify date, amount, and category have inputs
    if (catid == "" || amountInput == "")
    {
        const errorMessage = document.querySelector(".new-expense-error-message");

        errorMessage.textContent = "Please fill out category and amount.";
        errorMessage.classList.remove("hidden");
        return;
    }

    // make varaibles for year, month, and day
    let yearInput;
    let monthInput;
    let dayInput;

    if (dateInput == "")
    {
        let date = getDate();
        yearInput = date.Y;
        monthInput = date.M;
        dayInput = date.D;
    }
    else
    {
        let date = dateInput.split("-");
        yearInput = Number(date[0]);
        monthInput = Number(date[1]);
        dayInput = Number(date[2]);
    }

    // to send to rust function
    let newExpense =
    {
        c_id: Number(catid),
        amount: Math.round(Number(amountInput) * 100), // database uses cents
        year: yearInput,
        month: monthInput,
        day: dayInput,
        note: noteInput.trim() == "" ? null : noteInput.trim()
    }

    try
    {
        await invoke("add_expense", { expense: newExpense });
        document.querySelector(".new-expense-error-message").classList.add("hidden");
        getDropdownYears();
    }
    catch (error)
    {
        document.querySelector(".new-expense-error-message").textContent = "Save failed: " + error;
        document.querySelector(".new-expense-error-message").classList.remove("hidden"); 
    }
    finally
    {
        await closeNewExpensePopup();
        await loadExpenses(currentExpenseFilters);
    }
});

// opening and closing the expenses sorting menu
document.querySelector(".sort-expenses-button").addEventListener("click", async function()
{
    document.querySelector(".expenses-sorting-section").classList.toggle("hidden");
    await getSortingCategories();

    // get years and months for dropdowns
    await getDropdownYears();
    const mostRecentYear = document.querySelector(".expense-sorting-year-for-month-dropdown").options[0].value;
    await getDropdownMonths(mostRecentYear);

    await setSortingSelections(currentExpenseFilters);

    // close expense creation menu if open
    closeNewExpensePopup();
});

// opening and closing the sorting menu sections
document.querySelector(".date-exepenses-sorting").addEventListener("click", async function()
{
    document.querySelector(".date-expenses-sorting-icon-closed").classList.toggle("hidden");
    document.querySelector(".date-expenses-sorting-icon-open").classList.toggle("hidden");

    document.querySelector(".expenses-sorting-date-selection-menu").classList.toggle("hidden");
});
document.querySelector(".category-exepenses-sorting").addEventListener("click", async function()
{
    document.querySelector(".category-expenses-sorting-icon-closed").classList.toggle("hidden");
    document.querySelector(".category-expenses-sorting-icon-open").classList.toggle("hidden");

    document.querySelector(".expenses-sorting-category-selection-menu").classList.toggle("hidden");
});
document.querySelector(".amount-exepenses-sorting").addEventListener("click", async function()
{
    document.querySelector(".amount-expenses-sorting-icon-closed").classList.toggle("hidden");
    document.querySelector(".amount-expenses-sorting-icon-open").classList.toggle("hidden");

    document.querySelector(".expenses-sorting-amount-selection-menu").classList.toggle("hidden");

    // scroll down to show opened menu + note header
    document.querySelector(".note-exepenses-sorting").scrollIntoView({
        behavior: "smooth",
        block: "end"
    });
});
document.querySelector(".note-exepenses-sorting").addEventListener("click", async function()
{
    document.querySelector(".note-expenses-sorting-icon-closed").classList.toggle("hidden");
    document.querySelector(".note-expenses-sorting-icon-open").classList.toggle("hidden");

    document.querySelector(".expenses-sorting-note-selection-menu").classList.toggle("hidden");

    // scroll down to show opened menu
    document.querySelector(".expenses-sorting-note-selection-menu").scrollIntoView({
        behavior: "smooth",
        block: "end"
    });

    document.querySelector(".expenses-sorting-choices").scrollBy({
        top: 150,
        behavior: "smooth"
    })
});

// sorting menu date selection extra options hidding and unhiding
const sortingByDateRadios = document.querySelectorAll('input[name="expenses-sorting-filter-by-date"]');
sortingByDateRadios.forEach(function(radio) {
    radio.addEventListener("change", function() {
        const yearDropdown = document.querySelector(".sorting-selection-options-specific-year");
        const monthYearDropdown = document.querySelector(".sorting-selection-options-specific-year-for-month");
        const monthDropdown = document.querySelector(".sorting-selection-options-specific-month");
        const dateInput = document.querySelector(".expense-sorting-date");

        // hide everything first
        yearDropdown.classList.add("hidden");
        monthYearDropdown.classList.add("hidden");
        monthDropdown.classList.add("hidden");
        dateInput.classList.add("hidden");

        // show the controls for the selected option (and load years if needed)
        if (radio.value === "specific-year") {
            yearDropdown.classList.remove("hidden");

            getDropdownYears();
        }
        else if (radio.value === "specific-month") {
            monthYearDropdown.classList.remove("hidden");
            monthDropdown.classList.remove("hidden");

            getDropdownYears();
        }
        else if (radio.value === "specific-day") {
            dateInput.classList.remove("hidden");
        }
    });
});

// sorting menu amount selection extra option hidding and unhiding
const sortingByAmountRadios = document.querySelectorAll('input[name="expenses-sorting-filter-by-amount"]');
sortingByAmountRadios.forEach(function(radio) {
    radio.addEventListener("change", function() {
        const customRangeMin = document.querySelector(".min-sorting-label");
        const customRangeMax = document.querySelector(".max-sorting-label");

        // hide everything first
        customRangeMin.classList.add("hidden");
        customRangeMax.classList.add("hidden");

        // show the controls for the selected option
        if (radio.value === "specific-range") {
            customRangeMin.classList.remove("hidden");
            customRangeMax.classList.remove("hidden");
        }
        else {
            customRangeMin.classList.add("hidden");
            customRangeMax.classList.add("hidden");
        }
    });
});

// formatting for the min input for sorting
const expenseSortingMinInput = document.querySelector(".expense-sorting-min-amount");
expenseSortingMinInput.addEventListener("input", function () {
    let digits = expenseSortingMinInput.value.replace(/\D/g, "");

    let cents = Number(digits);

    expenseSortingMinInput.value = (cents / 100).toFixed(2);
});

// formatting for the max input for sorting
const expenseSortingMaxInput = document.querySelector(".expense-sorting-max-amount");
expenseSortingMaxInput.addEventListener("input", function () {
    let digits = expenseSortingMaxInput.value.replace(/\D/g, "");

    let cents = Number(digits);

    expenseSortingMaxInput.value = (cents / 100).toFixed(2);
});

// populate months dropdown depending on year dropdown selection
const yearDropdown = document.querySelector(".expense-sorting-year-for-month-dropdown");
yearDropdown.addEventListener("change", function() {
    getDropdownMonths(yearDropdown.value);
});

// save sorting selections
const saveSortingButton = document.querySelector(".save-new-expense-sorting-button");
saveSortingButton.addEventListener("click", async function () {
    const amountSortingError = document.querySelector('.expense-sorting-error-message');
    if (amountSortingError.classList.contains('hidden'))
    {
        await updateSortingSelections();
        loadExpenses(currentExpenseFilters);

        document.querySelector('.expenses-sorting-section').classList.add('hidden');
    }
});

// cancel sorting selections
const cancelSortingButton = document.querySelector(".cancel-new-expense-sorting-button");
cancelSortingButton.addEventListener("click", async function() {
    await setSortingSelections(currentExpenseFilters);

    document.querySelector('.expenses-sorting-section').classList.add('hidden');
});

// reset sorting options button
const resetSortingButton = document.querySelector(".reset-sorting-button");
resetSortingButton.addEventListener("click", async function() {
    // set current expense filters = default expense filters
    currentExpenseFilters.isAllTime = defaultExpenseFilters.isAllTime;
    currentExpenseFilters.year = defaultExpenseFilters.year;
    currentExpenseFilters.month = defaultExpenseFilters.month;
    currentExpenseFilters.day = defaultExpenseFilters.day;
    currentExpenseFilters.categoryID = defaultExpenseFilters.categoryID;
    currentExpenseFilters.isAnyAmount = defaultExpenseFilters.isAnyAmount;
    currentExpenseFilters.maxAmount = defaultExpenseFilters.maxAmount;
    currentExpenseFilters.minAmount = defaultExpenseFilters.minAmount;
    currentExpenseFilters.isNoNoteOnly = defaultExpenseFilters.isNoNoteOnly;
    currentExpenseFilters.sortBy = defaultExpenseFilters.sortBy;
    currentExpenseFilters.note = defaultExpenseFilters.note;
    
    console.log('before running setsorting');
    await setSortingSelections(currentExpenseFilters);
    console.log('after running setsorting');
    await loadExpenses(currentExpenseFilters);

    document.querySelector('.expenses-sorting-section').classList.add('hidden');
});