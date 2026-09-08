use rusqlite::{Connection, params};
use rusqlite::{params_from_iter, types::Value};
use serde::Deserialize;

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

use chrono::{Datelike, Local};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() 
{
    tauri::Builder::default()
        .setup(|app|
        {
            setup_database(app.handle())
                .map_err(|error| std::io::Error::new(std::io::ErrorKind::Other, error))?;

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler!
        [
            get_total_budget,
            add_category_and_budget,
            add_category_without_budget,
            get_categories_and_budgets,
            get_archived_categories_and_budgets,
            change_category_and_budget,
            count_archived_categories,
            new_month_budget_transfer,
            archive_category,
            unarchive_category,
            delete_category,
            add_expense,
            get_expense_years,
            get_expense_months,
            get_expenses
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


// -------------- GENERAL FUNCTIONS -------------- //


fn get_database_path(app: &tauri::AppHandle) -> Result<PathBuf, String>
{
    let app_data_dir = app.path().app_data_dir()
        .map_err(|error| error.to_string())?;

    fs::create_dir_all(&app_data_dir)
        .map_err(|error| error.to_string())?;

    let database_path = app_data_dir.join("finances.db");

    println!("Database path: {}", database_path.display());

    Ok(database_path)
}

// get connection to database
fn get_connection(app: &tauri::AppHandle) -> Result<Connection, String>
{
    let database_path = get_database_path(app)?;

    Connection::open(database_path)
        .map_err(|error| error.to_string())
}

fn setup_database(app: &tauri::AppHandle) -> Result<(), String>
{
    let conn = get_connection(app)?;
    let schema = include_str!("schema.sql");

    match conn.execute_batch(schema)
    {
        Ok(_) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}


// -------------- STRUCTS -------------- //


// for categories and budgets page functions
#[derive(Deserialize, serde::Serialize)]
struct CategoryWithBudget {
    name: String,
    color: String,
    budget: Option<i64>,
    month: Option<i32>,
    year: Option<i32>,
    c_id: Option<i64>
}

// for expenditures page functions
#[derive(Deserialize, serde::Serialize)]
struct ExpensesStruct {
    c_id: Option<i64>,
    name: Option<String>,
    e_id: Option<i64>,
    amount: i64,
    note: Option<String>,
    year: Option<i64>,
    month: Option<i64>,
    day: Option<i64>
}

// for expenditures page sorting
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExpenseFilters {
    is_all_time: bool,
    year: Option<i32>,
    month: Option<i32>,
    day: Option<i32>,
    category_id: Option<i32>,
    is_any_amount: Option<bool>,
    max_amount: Option<i64>,
    min_amount: Option<i64>,
    is_no_note_only: bool,
    sort_by: String,
    note: Vec<String>,
}


// -------------- DASHBOARD PAGE FUNCTIONS -------------- //

// getting the sum of all the budgets to get the total budget
#[tauri::command]
fn get_total_budget(app: tauri::AppHandle, month: i32, year: i32) -> Result<i64, String>
{
    // connect to the database
    let conn = get_connection(&app)?;


    // get the sum
    let total_budget: i64 = conn.query_row
    (
        "SELECT COALESCE(SUM(BUDGETS.bdgt_amount), 0)
        FROM BUDGETS
        JOIN CATEGORIES
            ON CATEGORIES.cat_id = BUDGETS.cat_id
        WHERE BUDGETS.bdgt_month = ?1 
            AND BUDGETS.bdgt_year = ?2
            AND CATEGORIES.is_archived = 0",
        params![month, year],
        |row| row.get(0),
    )
    .map_err(|error| error.to_string())?;

    Ok(total_budget)
}



// -------------- CATEGORIES AND BUDGETS PAGE FUNCTIONS -------------- //

// adding a category with a budget to the database
#[tauri::command]
fn add_category_and_budget(app: tauri::AppHandle, category: CategoryWithBudget) -> Result<(), String>
{
    // connect to the database
    let mut conn = get_connection(&app)?;

    // start a transaction so data isn't half saved
    let tx = conn.transaction()
        .map_err(|error| error.to_string())?;

    // insert the values into CATEGORIES
    tx.execute
    (
        "INSERT INTO CATEGORIES (cat_name, cat_color) VALUES (?1, ?2)",
        params![category.name, category.color],
    )
    .map_err(|error| error.to_string())?;

    // get the category id (cat_id)
    let cat_id = tx.last_insert_rowid();

    // guards for optional fields bc rust requires it
    let budget = category.budget.ok_or("Missing budget")?;
    let month = category.month.ok_or("Missing month")?;
    let year = category.year.ok_or("Missing year")?;
    
    // insert the values into BUDGETS
    tx.execute
    (
        "INSERT INTO BUDGETS (bdgt_month, bdgt_year, cat_id, bdgt_amount) VALUES (?1, ?2, ?3, ?4)",
        params![month, year, cat_id, budget],
    )
    .map_err(|error| error.to_string())?;

    // finish the transaction
    tx.commit()
    .map_err(|error| error.to_string())?;

    Ok(())
}

// adding a category without a budget (for future use)
#[tauri::command]
fn add_category_without_budget(app: tauri::AppHandle, category: CategoryWithBudget) -> Result<(), String>
{
    // connect to the database
    let conn = get_connection(&app)?;

    // insert the values into CATEGORIES
    conn.execute
    (
        "INSERT INTO CATEGORIES (cat_name, cat_color) VALUES (?1, ?2)",
        params![category.name, category.color],
    )
    .map_err(|error| error.to_string())?;    

    Ok(())
}

// get the categories with or without budgets from the database
#[tauri::command]
fn get_categories_and_budgets(app: tauri::AppHandle) -> Result<Vec<CategoryWithBudget>, String>
{
    // get the date
    let today = Local::now();

    let month = today.month() as i32;
    let year = today.year();

    // connect to the database
    let conn = get_connection(&app)?;

    // select and join categories with budgets (allowing for categories without budgets)
    let mut statement = conn.prepare
    (
        "SELECT 
            CATEGORIES.cat_name,
            CATEGORIES.cat_color,
            BUDGETS.bdgt_amount,
            BUDGETS.bdgt_month,
            BUDGETS.bdgt_year,
            CATEGORIES.cat_id
        FROM CATEGORIES
        LEFT JOIN BUDGETS 
            ON CATEGORIES.cat_id = BUDGETS.cat_id
            AND BUDGETS.bdgt_month = ?1
            AND BUDGETS.bdgt_year = ?2
        WHERE CATEGORIES.is_archived = 0"
    )
    .map_err(|error| error.to_string())?;

    // map each row into a CategoryWithBudget struct
    let category_rows = statement.query_map(
        params![month, year],
        |row| {
            Ok(CategoryWithBudget {
                name: row.get(0)?,
                color: row.get(1)?,
                budget: row.get(2)?,
                month: row.get(3)?,
                year: row.get(4)?,
                c_id: row.get(5)?,
            })
        },
    )
    .map_err(|error| error.to_string())?;

    // create an empty list to store each struct
    let mut categories = Vec::new();

    // put the structs in the list
    for category_row in category_rows
    {
        categories.push(category_row.map_err(|error| error.to_string())?);
    }

    Ok(categories)
}

// get the archived categories with or without budgets from the database
#[tauri::command]
fn get_archived_categories_and_budgets(app: tauri::AppHandle) -> Result<Vec<CategoryWithBudget>, String>
{
    // get the date
    let today = Local::now();

    let month = today.month() as i32;
    let year = today.year();

    // connect to the database
    let conn = get_connection(&app)?;

    // select and join categories with budgets (allowing for categories without budgets)
    let mut statement = conn.prepare
    (
        "SELECT 
            CATEGORIES.cat_name,
            CATEGORIES.cat_color,
            BUDGETS.bdgt_amount,
            BUDGETS.bdgt_month,
            BUDGETS.bdgt_year,
            CATEGORIES.cat_id
        FROM CATEGORIES
        LEFT JOIN BUDGETS 
            ON CATEGORIES.cat_id = BUDGETS.cat_id
            AND BUDGETS.bdgt_month = ?1
            AND BUDGETS.bdgt_year = ?2
        WHERE CATEGORIES.is_archived = 1"
    )
    .map_err(|error| error.to_string())?;

    // map each row into a CategoryWithBudget struct
    let category_rows = statement.query_map(
        params![month, year],
        |row| {
            Ok(CategoryWithBudget {
                name: row.get(0)?,
                color: row.get(1)?,
                budget: row.get(2)?,
                month: row.get(3)?,
                year: row.get(4)?,
                c_id: row.get(5)?,
            })
        },
    )
    .map_err(|error| error.to_string())?;

    // create an empty list to store each struct
    let mut categories = Vec::new();

    // put the structs in the list
    for category_row in category_rows
    {
        categories.push(category_row.map_err(|error| error.to_string())?);
    }

    Ok(categories)
}

// get the number of archived categories
#[tauri::command]
fn count_archived_categories(app: tauri::AppHandle) -> Result<i64, String>
{
    // get database connection
    let conn = get_connection(&app)?;

    // count the number of archived categories
    let count = conn.query_row(
        "SELECT COUNT(*)
         FROM CATEGORIES
         WHERE is_archived = 1",
        [],
        |row| row.get(0),
    )
    .map_err(|error| error.to_string())?;

    // return the number of archived categories
    Ok(count)
}

// edit category with budget
#[tauri::command]
fn change_category_and_budget(app: tauri::AppHandle, category: CategoryWithBudget) -> Result<(), String>
{
    // connect to the database
    let mut conn = get_connection(&app)?;

    // start a transaction so data isn't half saved
    let tx = conn.transaction()
        .map_err(|error| error.to_string())?;

    // guards for optional fields bc rust requires it
    let budget = category.budget.ok_or("Missing budget")?;
    let month = category.month.ok_or("Missing month")?;
    let year = category.year.ok_or("Missing year")?;
    let catid = category.c_id.ok_or("Missing category id")?;

    // change the values in CATEGORIES
    tx.execute
    (
        "UPDATE CATEGORIES
         SET cat_name = ?1,
             cat_color = ?2
         WHERE cat_id = ?3",
        params![category.name, category.color, catid],
    )
    .map_err(|error| error.to_string())?;

    // change the values in BUDGETS
    tx.execute
    (
        "INSERT INTO BUDGETS (bdgt_month, bdgt_year, cat_id, bdgt_amount)
        VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(bdgt_month, bdgt_year, cat_id)
        DO UPDATE SET bdgt_amount = excluded.bdgt_amount",
        params![month, year, catid, budget],
    )
    .map_err(|error| error.to_string())?;

    // finish the transaction
    tx.commit()
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn new_month_budget_transfer(app: tauri::AppHandle) -> Result<(), String>
{
    // get the current date
    let today = Local::now();
    let cur_month = today.month() as i32;
    let cur_year = today.year();

    // get the previous month
    let mut prev_month = cur_month - 1;
    let mut prev_year = cur_year;

    if prev_month == 0
    {
        prev_month = 12;
        prev_year -= 1;
    }

    // get connection to the database
    let conn = get_connection(&app)?;

    conn.execute
    (
        "INSERT OR IGNORE INTO BUDGETS (bdgt_month, bdgt_year, cat_id, bdgt_amount)
        SELECT
            ?1,
            ?2,
            BUDGETS.cat_id,
            BUDGETS.bdgt_amount
        FROM BUDGETS
        JOIN CATEGORIES
            ON CATEGORIES.cat_id = BUDGETS.cat_id
        WHERE BUDGETS.bdgt_month = ?3
        AND BUDGETS.bdgt_year = ?4
        AND CATEGORIES.is_archived = 0",
        params![cur_month, cur_year, prev_month, prev_year]
    )
    .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn archive_category(app: tauri::AppHandle, category: CategoryWithBudget) -> Result<(), String>
{
    // connect to the database
    let mut conn = get_connection(&app)?;

    // start a transaction so data isn't half saved
    let tx = conn.transaction()
        .map_err(|error| error.to_string())?;

    // get the cat_id
    let catid = category.c_id.ok_or("Missing category id")?;

    // set is_archives to 1 (true) in CATEGORIES
    tx.execute
    (
        "UPDATE CATEGORIES
        SET is_archived = 1
        WHERE cat_id = ?1",
        params![catid]
    )
    .map_err(|error| error.to_string())?;

    // get the date to delete the budget for the current month
    let today = Local::now();
    let month = today.month() as i32;
    let year = today.year();

    tx.execute
    (
        "DELETE FROM BUDGETS
        WHERE cat_id = ?1
        AND bdgt_month = ?2
        AND bdgt_year = ?3",
        params![catid, month, year]
    )
    .map_err(|error| error.to_string())?;

    // finish the transaction
    tx.commit()
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
fn unarchive_category(app: tauri::AppHandle, category: CategoryWithBudget) -> Result<(), String>
{
    // connect to the database
    let conn = get_connection(&app)?;

    // get the cat_id
    let catid = category.c_id.ok_or("Missing category id")?;

    // insert the values into CATEGORIES
    conn.execute
    (
        "UPDATE CATEGORIES
        SET is_archived = 0
        WHERE cat_id = ?1",
        params![catid]
    )
    .map_err(|error| error.to_string())?;    

    Ok(())
}

#[tauri::command]
fn delete_category(app: tauri::AppHandle, category: CategoryWithBudget) -> Result<(), String>
{
    // connect to the database
    let mut conn = get_connection(&app)?;

    // start a transaction so data isn't half saved
    let tx = conn.transaction()
        .map_err(|error| error.to_string())?;

    // get the cat_id
    let catid = category.c_id.ok_or("Missing category id")?;

    // check if the category has any attached expenditures
    let expenditure_count: i64 = tx.query_row
    (
        "SELECT COUNT(*)
        FROM EXPENDITURES
        WHERE cat_id = ?1",
        params![catid],
        |row| row.get(0),
    )
    .map_err(|error| error.to_string())?;    

    // if it has expenditures, return an error
    if expenditure_count > 0 
    {
        return Err("This category has expenditures and cannot be deleted.".to_string());
    }

    // otherwise delete budgets attached to it and then the category
    tx.execute(
        "DELETE FROM BUDGETS
         WHERE cat_id = ?1",
        params![catid],
    )
    .map_err(|error| error.to_string())?;

    tx.execute(
        "DELETE FROM CATEGORIES
         WHERE cat_id = ?1",
        params![catid],
    )
    .map_err(|error| error.to_string())?;

    // end the transaction
    tx.commit()
        .map_err(|error| error.to_string())?;

    Ok(())

}


// -------------- EXPENDITURES PAGE FUNCTIONS -------------- // 

// to add an expense entry to the database
#[tauri::command]
fn add_expense(app: tauri::AppHandle, expense: ExpensesStruct) -> Result<(), String> 
{ 
    // get connection to database 
    let conn = get_connection(&app)?; 
    
    // different inserts depending on if a note was added or not
    if expense.note.is_none()
    { 
        conn.execute 
        ( 
            "INSERT INTO EXPENDITURES
            (exp_day, exp_month, exp_year, exp_amount, cat_id)
            VALUES (?1, ?2, ?3, ?4, ?5)", 
            params![expense.day, expense.month, expense.year, expense.amount, expense.c_id]
        ) 
        .map_err(|error| error.to_string())?; 
    } 
    else 
    { 
        conn.execute 
        ( 
            "INSERT INTO EXPENDITURES
            (exp_day, exp_month, exp_year, exp_amount, cat_id, exp_note) 
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)", 
            params![expense.day, expense.month, expense.year, expense.amount, expense.c_id, expense.note] 
        ) 
        .map_err(|error| error.to_string())?; 
    } 
    
    Ok(()) 
}

// get the years where there are expense entries
#[tauri::command]
fn get_expense_years(app: tauri::AppHandle) -> Result<Vec<i32>, String>
{
    // get database connection
    let conn = get_connection(&app)?;

    // get all the years where there's expenditures
    let mut statement= conn.prepare(
        "SELECT DISTINCT exp_year
         FROM EXPENDITURES
         ORDER BY exp_year DESC"
    )
    .map_err(|error| error.to_string())?;

    // read the years
    let rows = statement.query_map([], |row| row.get::<_, i32>(0))
        .map_err(|error| error.to_string())?;

    // collect the years into a vector
    let mut years = Vec::new();

    for row in rows
    {
        let year = row.map_err(|error| error.to_string())?;
        years.push(year);
    }

    Ok(years)
}

// get the months where there are expense entries for a specific year
#[tauri::command]
fn get_expense_months(app: tauri::AppHandle, year: i32) -> Result<Vec<i32>, String>
{
    // get database connection
    let conn = get_connection(&app)?;

    // get the months where there's expenditures for the year
    let mut statement = conn.prepare(
    "SELECT DISTINCT exp_month
     FROM EXPENDITURES
     WHERE exp_year = ?1
     ORDER BY exp_month DESC"
    )
    .map_err(|error| error.to_string())?;

    let rows = statement.query_map(params![year], |row| row.get::<_, i32>(0))
        .map_err(|error| error.to_string())?;

    // collect the years into a vectors
    let mut months = Vec::new();

    for row in rows
    {
        let month = row.map_err(|error| error.to_string())?;
        months.push(month);
    }

    Ok(months)
}

// get all the expenditures
#[tauri::command]
fn get_expenses(app: tauri::AppHandle, filters: ExpenseFilters) -> Result<Vec<ExpensesStruct>, String>
{
    // start query and parameters list
    let mut query = String::from(
        "SELECT
            CATEGORIES.cat_id,
            CATEGORIES.cat_name,
            EXPENDITURES.exp_id,
            EXPENDITURES.exp_amount,
            EXPENDITURES.exp_note,
            EXPENDITURES.exp_year,
            EXPENDITURES.exp_month,
            EXPENDITURES.exp_day
        FROM EXPENDITURES
        JOIN CATEGORIES ON EXPENDITURES.cat_id = CATEGORIES.cat_id
        WHERE 1 = 1 "
    );
    let mut parameters: Vec<Value> = Vec::new();

    // date filtering
    if !filters.is_all_time
    {
        // add year to sql
        query.push_str("AND exp_year = ? ");
        parameters.push(Value::Integer(filters.year.unwrap() as i64));

        // check if month exists
        if filters.month.is_some()
        {
            query.push_str("AND exp_month = ? ");
            parameters.push(Value::Integer(filters.month.unwrap() as i64));
        }

        // check if day exists
        if filters.day.is_some()
        {
            query.push_str("AND exp_day = ? ");
            parameters.push(Value::Integer(filters.day.unwrap() as i64));
        }
    }

    // category filtering
    if filters.category_id.is_some()
    {
        query.push_str("AND cat_id = ? ");
        parameters.push(Value::Integer(filters.category_id.unwrap() as i64));
    }

    // amount filtering
    if !filters.is_any_amount.is_some()
    {
        if filters.max_amount.is_some()
        {
            query.push_str("AND exp_amount <= ? ");
            parameters.push(Value::Integer(filters.max_amount.unwrap() as i64));
        }
        if filters.min_amount.is_some()
        {
            query.push_str("AND exp_amount >= ? ");
            parameters.push(Value::Integer(filters.min_amount.unwrap() as i64));
        }
    }

    // note filtering
    if !filters.is_no_note_only && !filters.note.is_empty()
    {
        query.push_str("AND (");

        // add each keyword at a time using OR in between
        for (index, keyword) in filters.note.iter().enumerate()
        {
            if index > 0
            {
                query.push_str(" OR ");
            }

            query.push_str("exp_note LIKE ?");
            parameters.push(Value::Text(format!("%{}%", keyword)));
        }

        query.push_str(") ");
    }
    else if filters.is_no_note_only
    {
        query.push_str("AND exp_note IS NULL ");
    }

    // ordering
    if filters.sort_by == "date-old-first"
    {
        query.push_str("ORDER BY exp_year ASC, exp_month ASC, exp_day ASC");
    }
    else if filters.sort_by == "date-new-first"
    {
        query.push_str("ORDER BY exp_year DESC, exp_month DESC, exp_day DESC");
    }
    else if filters.sort_by == "amount-greatest-first"
    {
        query.push_str("ORDER BY exp_amount DESC");
    }
    else if filters.sort_by == "amount-least-first"
    {
        query.push_str("ORDER BY exp_amount ASC");
    }

    // get the connection to the database
    let conn = get_connection(&app)?;
    let mut statement = conn.prepare(&query).map_err(|e| e.to_string())?;

    // get the expenditures from the database
    let expense_rows = statement.query_map
    (
        params_from_iter(parameters),
        |row|
        {
            Ok(ExpensesStruct {
                c_id: row.get(0)?,
                name: row.get(1)?,
                e_id: row.get(2)?,
                amount: row.get(3)?,
                note: row.get(4)?,
                year: row.get(5)?,
                month: row.get(6)?,
                day: row.get(7)?,
            })
        }
    ).map_err(|e| e.to_string())?;

    // turn rows into a vector and return it
    let expenses: Vec<ExpensesStruct> = expense_rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(expenses)
}