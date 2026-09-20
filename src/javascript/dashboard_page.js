// import invoke (to call rust functions from js)
const invoke = window.__TAURI__.core.invoke;

// imports
import { getDate } from "./helpers.js";

// update dashboard (called every minute in main.js)
export function updateDash()
{
    let date = getDate();

    // change the dashboard month and year to match current
    document.querySelector(".dash-date").textContent = date.MN + " " + date.Y + " Analytics";

    updateBudgetBar();
}

export async function updateBudgetBar()
{
    const budget = (await invoke("get_total_budget")) / 100;
    const spent = (await invoke("get_total_spent")) / 100;

    const left = budget - spent;
    let offset;

    if (spent == 0)
    {
        document.querySelector(".budget-icon-full").classList.add('hidden');
    }
    else
    {
        document.querySelector(".budget-icon-full").classList.remove('hidden');
    }

    if (left < 0)
    {
        // if left is negative the bar is 100% full
        offset = 0;
        document.querySelector(".budget-bar-amount").textContent = "- $" + Math.abs(left).toFixed(2);
    }
    else
    {
        let percentUsed = spent / budget;
        offset = 100 - percentUsed * 100;
        document.querySelector(".budget-bar-amount").textContent = "$" + left.toFixed(2);
    }
    document.querySelector(".budget-icon-full").style.strokeDashoffset = offset;

    // showing budget and amount spent on dashboard
    document.querySelector(".dash-budget").textContent = "  $" + budget.toFixed(2);
    document.querySelector(".dash-spent").textContent = "  $" + spent.toFixed(2);

}
