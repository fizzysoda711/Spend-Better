// import invoke (to call rust functions from js)
const invoke = window.__TAURI__.core.invoke;

// js imports
import Chart from "https://cdn.jsdelivr.net/npm/chart.js@4.5.0/auto/+esm";

// variables to hold the charts to avoid chart duplication
let categoriesPieChart = null;
let budgetsBarChart = null;
let expensesVsBudgetsBarChart = null;

// to load all graphics
export function loadAllGraphics()
{
    loadCategoriesPieChart();
    loadBudgetsOverTime();
    loadExpensesVsBudgetsOverTime();
    loadExpensesVsBudgetsOverTimePerCategory();
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

                if(chart.legend.options.position == "bottom" || chart.legend.options.position === "top")
                {
                    this.height += space;
                }
                else
                {
                    this.width += space;
                }
                chart.legend.options.position == "bottom";
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

    let summary = [];
    let summaries = [];

    for (let i = 0; i < 6; i++)
    {
        if (month == -1) { month = 12; year -= 1; }

        let summary = {
            monthNum: month + 1,
            monthShorthand: monthShorthands[month],
            year: year
        }

        month = month - 1;

        summaries.push(summary);
    }

    return summaries;
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
            responsive: true,
            maintainAspectRatio: false,

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

export async function loadBudgetsOverTime()
{
    const chart = document.querySelector(".budgets-bar-chart");

    const summaries = await invoke("get_data_for_six_months");
    const budgetData = summaries.map(summary => summary.totalBudget).reverse();
    const months = getLastSixMonths();
    let labels = months.map(month => month.monthShorthand).reverse();
    labels[5] = "Now";


    if (budgetsBarChart)
    {
        budgetsBarChart.destroy();
        budgetsBarChart = null;
    }

    budgetsBarChart = new Chart(chart, {
        type: "bar",
        data:
        {
            labels: labels,
            datasets:
            [
                {
                    data: budgetData,
                    backgroundColor: "rgb(90, 121, 88)",

                    borderRadius:
                    {
                        topLeft: 8,
                        topRight: 8,
                        bottomLeft: 0,
                        bottomRight: 0
                    }
                }
            ]
        },

        options:
        {
            responsive: true,
            maintainAspectRatio: false,

            plugins:
            {
                legend:
                {
                    display: false
                },

                tooltip:
                {
                    callbacks:
                    {
                        label: function(context)
                        {
                            return `$${(context.raw / 100).toFixed(2)}`;
                        }
                    }
                }
            },

            scales:
            {
                y:
                {
                    ticks:
                    {
                        color: "gray",

                        callback: function(value)
                        {
                            return ` $${(value / 100).toFixed(0)}`;
                        }
                    },


                    grid:
                    {
                        color: "rgba(255, 255, 255, 0.1)"
                    }
                },

                x:
                {
                    ticks:
                    {
                        color: "gray"
                    },

                    grid:
                    {
                        display: false
                    }
                }
            }
        }
    });
    
}

export async function loadExpensesVsBudgetsOverTime()
{
    const chart = document.querySelector(".budget-vs-spent-chart");

    const summaries = await invoke("get_data_for_six_months");

    const budgets = summaries.map(summary => summary.totalBudget).reverse();
    const spent = summaries.map(summary => summary.totalSpent).reverse();
    const monthShorthands = getLastSixMonths().map(date => date.monthShorthand).reverse();
    
    let colors = [];
    let left = [];
    let validAvgValues = [];

    for (let i = 0; i < 6; i++)
    {
        if (budgets[i] - spent[i] < 0) { colors.push("rgb(157, 0, 0)"); }
        else { colors.push("rgb(54, 111, 54)"); }

        left.push((budgets[i] - spent[i]) / 100);
    }

    const maxDifference = Math.max(...left.map(Math.abs));

    let average = 0;
    let divideBy = 600;

    for (let i = 0; i < 6; i++)
    {
        average += (budgets[i] - spent[i]);

        if (budgets[i] == 0 && spent[i] == 0)
        {
            divideBy = divideBy - 100;
        }
    }

    average = average / divideBy;


    if (expensesVsBudgetsBarChart)
    {
        expensesVsBudgetsBarChart.destroy();
        expensesVsBudgetsBarChart = null;
    }

    expensesVsBudgetsBarChart = new Chart(chart, {
        type: "bar",
        data:
        {
            labels: monthShorthands,
            datasets:
            [
                {
                    label: "Variance",
                    data: left,
                    backgroundColor: colors,

                    borderRadius: function(context)
                    {
                        // if 0 is at the bottom
                        if (context.raw >= 0)
                        {
                            return {
                                topLeft: 5,
                                topRight: 5,
                                bottomLeft: 0,
                                bottomRight: 0
                            };
                        }

                        // if 0 is at the top.
                        return {
                            topLeft: 0,
                            topRight: 0,
                            bottomLeft: 5,
                            bottomRight: 5
                        };
                    },

                    borderSkipped: false,

                    barPercentage: 0.6,
                    categoryPercentage: 0.75,

                    order: 1
                }
            ]
        },

        options:
        {
            responsive: true,
            maintainAspectRatio: false,

            plugins:
            {
                legend:
                {
                    display: false,

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
                            if (context.raw < 0)
                            {
                                return ` - $${Math.abs(context.raw).toFixed(2)}`;
                            }
                            else
                            {
                                return ` $${(context.raw).toFixed(2)}`;
                            }
                        }
                    }
                }
            },

            scales:
            {
                y:
                {
                    suggestedMin: -maxDifference,
                    suggestedMax: maxDifference,

                    ticks:
                    {
                        color: "gray",

                        callback: function(value)
                        {
                            if (value < 0)
                            {
                                return `- $${Math.abs(value).toFixed(0)}`;
                            }

                            return `$${value.toFixed(0)}`;
                        }
                    },


                    grid:
                    {
                        color: function(context)
                        {
                            if (context.tick.value === 0)
                            {
                                return "rgba(255, 255, 255, 0.60)";
                            }

                            return "rgba(255, 255, 255, 0.1)";
                        },

                        lineWidth: function(context)
                        {
                            if (context.tick.value === 0)
                            {
                                return 2;
                            }

                            return 1;
                        }
                    }
                },

                x:
                {
                    ticks:
                    {
                        color: "gray"
                    },

                    grid:
                    {
                        display: false
                    }
                }
            }
        }
    });


    if (average < 0)
    {
        document.querySelector('.budget-vs-spent-chart-subtitle').textContent = `Average Variance: - $${Math.abs(average).toFixed(2)}`;
    }
    else
    {
        document.querySelector('.budget-vs-spent-chart-subtitle').textContent = `Average Variance: $${(average).toFixed(2)}`;
    }
    
    
}

export async function loadExpensesVsBudgetsOverTimePerCategory()
{   
    const summariesDiv = document.querySelector('.category-expense-summaries');

    summariesDiv.innerHTML = "";

    const summaries = await invoke ("get_six_month_summaries_per_category");
    console.log("all category summaries:", summaries);

    for (const summary of summaries)
    {
        console.log("one category:", summary);
        console.log("its months:", summary.monthly_summaries);


        const box = document.createElement('div');
        box.classList.add('column');
        box.classList.add('category-expense-summary-chart-all');

        box.innerHTML =
        `
            <div class="row vertical-center" style="gap: 5px">
                <p class="category-expense-summary-chart-title-label">Category: </p>
                <p class="category-expense-summary-chart-title" style="color: ${summary.c_color}"> ${summary.c_name}</p>
            </div>
            <p class="category-expense-summary-chart-subtitle"></p>
            <div class="category-expense-summary-chart-wrapper">
                <canvas class="category-expense-summary-chart"></canvas>
            </div>
        `;

        const chart = box.querySelector('.category-expense-summary-chart');

        const budgets = summary.monthly_summaries.map(month => month.m_budget).reverse();
        const spent = summary.monthly_summaries.map(month => month.m_spent).reverse();
        const monthShorthands = getLastSixMonths().map(date => date.monthShorthand).reverse();

        let colors = [];
        let left = [];
        let validAvgValues = [];

        for (let i = 0; i < 6; i++)
        {
            if (budgets[i] - spent[i] < 0) { colors.push("rgb(157, 0, 0)"); }
            else { colors.push("rgb(54, 111, 54)"); }

            left.push((budgets[i] - spent[i]) / 100);
        }

        const maxDifference = Math.max(...left.map(Math.abs));

        let average = 0;
        let divideBy = 600;

        for (let i = 0; i < 6; i++)
        {
            average += (budgets[i] - spent[i]);

            if (budgets[i] == 0 && spent[i] == 0)
            {
                divideBy = divideBy - 100;
            }
        }

        average = average / divideBy;


        expensesVsBudgetsBarChart = new Chart(chart, {
            type: "bar",
            data:
            {
                labels: monthShorthands,
                datasets:
                [
                    {
                        label: "Variance",
                        data: left,
                        backgroundColor: colors,

                        borderRadius: function(context)
                        {
                            // if 0 is at the bottom
                            if (context.raw >= 0)
                            {
                                return {
                                    topLeft: 5,
                                    topRight: 5,
                                    bottomLeft: 0,
                                    bottomRight: 0
                                };
                            }

                            // if 0 is at the top.
                            return {
                                topLeft: 0,
                                topRight: 0,
                                bottomLeft: 5,
                                bottomRight: 5
                            };
                        },

                        borderSkipped: false,

                        barPercentage: 0.6,
                        categoryPercentage: 0.75,

                        order: 1
                    }
                ]
            },

            options:
            {
                responsive: true,
                maintainAspectRatio: false,

                plugins:
                {
                    legend:
                    {
                        display: false,

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
                                const index = context.dataIndex;

                                const budget = budgets[index] / 100;
                                const amountSpent = spent[index] / 100;
                                let varianceText = context.raw;

                                if (context.raw < 0)
                                {
                                    varianceText = ` - $${Math.abs(context.raw).toFixed(2)}`;
                                }
                                else
                                {
                                    varianceText = ` $${(context.raw).toFixed(2)}`;
                                }

                                return [
                                    `Variance: ${varianceText}`,
                                    `Budget: $${budget.toFixed(2)}`,
                                    `Spent: $${amountSpent.toFixed(2)}`
                                ];
                            }
                        }
                    }
                },

                scales:
                {
                    y:
                    {
                        suggestedMin: -maxDifference,
                        suggestedMax: maxDifference,

                        ticks:
                        {
                            color: "gray",

                            callback: function(value)
                            {
                                if (value < 0)
                                {
                                    return `- $${Math.abs(value).toFixed(0)}`;
                                }

                                return `$${value.toFixed(0)}`;
                            }
                        },


                        grid:
                        {
                            color: function(context)
                            {
                                if (context.tick.value === 0)
                                {
                                    return "rgba(255, 255, 255, 0.60)";
                                }

                                return "rgba(255, 255, 255, 0.1)";
                            },

                            lineWidth: function(context)
                            {
                                if (context.tick.value === 0)
                                {
                                    return 2;
                                }

                                return 1;
                            }
                        }
                    },

                    x:
                    {
                        ticks:
                        {
                            color: "gray"
                        },

                        grid:
                        {
                            display: false
                        }
                    }
                }
            }
        });

        summariesDiv.appendChild(box);
        box.dataset.averageVariance = average;

        if (average < 0)
        {
            box.querySelector('.category-expense-summary-chart-subtitle').textContent = `Average Variance: - $${Math.abs(average).toFixed(2)}`;
        }
        else
        {
            box.querySelector('.category-expense-summary-chart-subtitle').textContent = `Average Variance: $${(average).toFixed(2)}`;
        }
    }

    // sort boxes by variance (low to high)
    const boxes = [...summariesDiv.querySelectorAll('.category-expense-summary-chart-all')];

    boxes.sort((a, b) =>
    {
        return Number(a.dataset.averageVariance) - Number(b.dataset.averageVariance);
    });

    for (const box of boxes)
    {
        summariesDiv.appendChild(box);
    }
}