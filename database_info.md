ER DIAGRAM <- make into hyperlink
-

**Database Design**

CATEGORIES
- category_id (primary key)
- category_name (unique)
- category_color
- category_is_archived (bool)
Note: Duplicate categories will not be allowed.

BUDGETS
- budget_id (primary key)
- category_id (foreign key)
- budget_amount
Note: Budgets will carry over to the next month until manually changed.


EXPENDITURES
- entry_id (primary key, auto-generated)
- category_name (foreign key)
- amount_spent
- date
- note (optional)



**Query Functions**

show expenditures by month, date, or year
- gives overall total spent
- gives total spent in each category and how much was over or under the budget
  
