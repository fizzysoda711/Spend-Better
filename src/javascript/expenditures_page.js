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
    sortBy: "",
    note: []
}

const defaultExpenseFilters = {
    isAllTime: false,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: null,
    categoryID: null,
    isAnyAmount: true,
    maxAmount: null,
    minAmount: null,
    isNoNoteOnly: false,
    sortBy: "",
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
        let keywordsList = keywords.split(",").map(keyword => keyword.trim().toLowerCase()).filter(keyword != "");
        currentExpenseFilters.note = keywordsList;
    }

    // ordering
    currentExpenseFilters.sortBy = ordering;
}

// add function to load expenses based on current sorting selections
export async function loadExpenses(expenseFilters)
{
    const expenses = await invoke("get_expenses", {
        filters: expenseFilters
    });

    const container = document.querySelector(".expenses-list");
    container.innerHTML = "";

    categories.forEach(category => {
        const box = document.createElement("div");

        box.classList.add("expense-box");

        box.innerHTML = 
        `
            
        `
        ;

    });
}



// ----- EXPENDITURES PAGE SPECIFIC BEHAVIORS ----- //

// new expense button and input menu
document.querySelector(".new-expense-button").addEventListener("click", async function() {
    document.querySelector(".new-expense-inputs").classList.remove("hidden");
    document.querySelector(".new-expense-button").classList.add("hidden");

    await getDropdownCategories();
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
    }
    // finish finally block and use load expenses function
});

// opening and closing the expenses sorting menu
document.querySelector(".sort-expenses-button").addEventListener("click", async function()
{
    document.querySelector(".expenses-sorting-section").classList.toggle("hidden");
    await getSortingCategories();

    // get years and months for dropdowns
    await getDropdownYears();
    const mostRecentYear = document.querySelector(".expense-sorting-year-for-month-dropdown").options[0].value;
    getDropdownMonths(mostRecentYear);
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

