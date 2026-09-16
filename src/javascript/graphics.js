// import invoke (to call rust functions from js)
const invoke = window.__TAURI__.core.invoke;

// js imports
import Chart from "https://cdn.jsdelivr.net/npm/chart.js@4.5.0/auto/+esm";

// variables to hold the charts to avoid chart duplication
let categoriesPieChart = null;

// to load all graphics
export function loadAllGraphics()
{
    loadCategoriesPieChart();
}

// helpers

function legendAndChartSpacing(space)
{
    return {
        id: "spacingBetweenLegendAndChart",

        beforeInit(chart)
        {
            const originalFit = chart.legend.fit;

            chart.legend.fit = function()
            {
                originalFit.bind(chart.legend)();

                if(chart.legend.options.position == "top" || chart.legend.options.position === "bottom")
                {
                    this.height += space;
                }
                else
                {
                    this.width += space;
                }
            };
        }
    };
}

function getLastSixMonths()
{
    let now = new Date();
    
    let year = now.getFullYear();
    let month = now.getMonth();

    let monthShorthands = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec"
    ]

    let lastSixMonths = [];

    for (i = 0; i < 6; i++)
    {
        if (month == -1) { month = 12; }

        lastSixMonths.push(monthShorthands(month))
        month = month - 1;
    }

    return lastSixMonths;
}

// for the categories page

export async function loadCategoriesPieChart()
{
    const chart = document.querySelector(".categories-page-pie-chart");

    const categories = await invoke("get_categories_and_budgets");

    let categoryNames = [];
    let categoryBudgets = [];
    let categoryColors = [];

    for (const category of categories)
    {
        if (category.budget != null && category.budget > 0)
        {
            categoryNames.push(category.name);
            categoryBudgets.push(category.budget);
            categoryColors.push(category.color);
        }
    }

    // delete chart if it exists already
    if (categoriesPieChart)
    {
        categoriesPieChart.destroy();
        categoriesPieChart = null;
    }

    categoriesPieChart = new Chart(chart, {
        type: "pie",
        data:
        {
            labels: categoryNames,
            datasets:
            [
                {
                    data: categoryBudgets,
                    backgroundColor: categoryColors,

                    borderColor: "#121b14",
                    borderWidth: 2,
                    borderAlign: "inner",
                }
            ]
        },

        options:
        {
            plugins:
            {
                legend:
                {
                    display: true,

                    labels:
                    {
                        usePointStyle: true,
                        pointStyle: "circle",
                        color: "white",
                        padding: 30,
                    }
                },

                tooltip:
                {
                    callbacks:
                    {
                        label: function(context)
                        {
                            const budget = context.raw;
                            const label = context.label;

                            return " $" + (budget / 100).toFixed(2);
                        }
                    }
                }
            }
        },

        plugins:
        [
            legendAndChartSpacing(20)
        ]
    });

    // set the total underneath it
    document.querySelector('.categories-pie-chart-total').value = (await invoke("get_total_budget")) / 100;
}

/* export async function loadBudgetsOverTime()
{
    const chart = document.querySelector(".budgets-bar-chart");

    // use function to get budget

} */
