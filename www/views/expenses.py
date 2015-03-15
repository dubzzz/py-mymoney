#!/usr/bin/python

from tornado.web import RequestHandler, authenticated, asynchronous
from auth import BaseHandler
import sqlite3

from calendar import monthrange
import re
import sys
from os import path

__CURRENT_PATH = path.dirname(__file__)

sys.path.append(path.join(__CURRENT_PATH, "..", "scripts"))
from generate_db import DEFAULT_DB

sys.path.append(path.join(__CURRENT_PATH, "utilities"))
from request_helper import ForbiddenOperationException, xmlcontent, raise404, donotpropagate_forbidden_operation
from trees import getRootId, getPathToNodeFromTrees, retrieveTrees

# HTML Webpages

class AddExpensesHandler(BaseHandler):
    @authenticated
    @asynchronous
    def get(self):
        r"""
        Form to give the ability to add several expenses
        """
        
        self.xsrf_token
        
        expenses = []
        conn = sqlite3.connect(DEFAULT_DB)
        with conn:
            c = conn.cursor()
            c.execute('''SELECT DISTINCT id, title FROM expense
                         ORDER BY id DESC LIMIT 500''')
            expenses = c.fetchall()

        self.render("add_expenses.html", page="add_expenses", expenses=expenses)

class DisplayExpensesHandler(BaseHandler):
    @authenticated
    @asynchronous
    def get(self):
        r"""
        Table containing all the expenses already saved
        """
        
        expenses = dict()
        conn = sqlite3.connect(DEFAULT_DB)
        with conn:
            c = conn.cursor()
            c.execute('''SELECT expense.id, expense.title, (expense.date-2440587.5)*86400.0 AS udate,
                                expense.price, node_expense.node_id, node.title
                         FROM expense
                         LEFT OUTER JOIN node_expense
                                ON expense.id = node_expense.expense_id
                                AND node_expense.visible = 1
                         LEFT OUTER JOIN node
                                ON node_expense.node_id = node.id''')
            data_db = c.fetchall()
            for db_info in data_db:
                if db_info[0] not in expenses:
                     expenses[db_info[0]] = {
                             'title': db_info[1],
                             'date': db_info[2],
                             'price': db_info[3],
                             'categories': dict(),
                     }
                expenses[db_info[0]]["categories"][db_info[4]] = db_info[5]

        self.xsrf_token
        self.render("display_expenses.html", page="display_expenses", expenses=expenses)

class DisplayTreeExpensesHandler(BaseHandler):
    @authenticated
    @asynchronous
    def get(self):
        r"""
        Table containing all the expenses already saved
        """
        
        expenses = dict()
        conn = sqlite3.connect(DEFAULT_DB)
        with conn:
            c = conn.cursor()
            c.execute('''SELECT expense.id, expense.title, (expense.date-2440587.5)*86400.0 AS udate,
                                expense.price, node_expense.node_id, node.title
                         FROM expense
                         LEFT OUTER JOIN node_expense
                                ON expense.id = node_expense.expense_id
                                AND node_expense.visible = 1
                         LEFT OUTER JOIN node
                                ON node_expense.node_id = node.id''')
            data_db = c.fetchall()
            for db_info in data_db:
                if db_info[0] not in expenses:
                     expenses[db_info[0]] = {
                             'title': db_info[1],
                             'date': db_info[2],
                             'price': db_info[3],
                             'categories': dict(),
                     }
                expenses[db_info[0]]["categories"][db_info[4]] = db_info[5]

        self.xsrf_token
        self.render("display_tree_expenses.html", page="display_tree_expenses", expenses=expenses)

# JSON answers

def addExpense(msg):
    r"""
    Add an expense to the database
    Conditions
    ----------
    - category is a node
    - category is a leaf node
    - categories are from different trees
    """
    
    try:
        expense_client_id = int(msg["client_id"])
    except (KeyError, TypeError, ValueError) as e:
        expense_client_id = -1
    
    try:
        expense_title = msg["title"]
    except KeyError as e:
        raise ForbiddenOperationException('Malformed query: missing title')
    
    try:
        expense_date_str = msg["date"]
    except KeyError as e:
        raise ForbiddenOperationException('Malformed query: missing date')
    m = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})$', expense_date_str)
    if not m:
        raise ForbiddenOperationException('Malformed query: invalid date format (yyyy-mm-dd)')
    expense_date_year = int(m.group(1))
    expense_date_month = int(m.group(2))
    expense_date_day = int(m.group(3))
    if expense_date_month < 1 or expense_date_month > 12:
        raise ForbiddenOperationException('Malformed query: invalid date (month 1-12)')
    if expense_date_day < 1 or expense_date_day > monthrange(expense_date_year, expense_date_month)[1]:
        raise ForbiddenOperationException('Malformed query: invalid date (day 1-%d)' % (monthrange(expense_date_year, expense_date_month)[1],))
    
    try:
        expense_price = float(msg["price"])
    except (KeyError, TypeError, ValueError) as e:
        raise ForbiddenOperationException('Malformed query: missing price')
    if expense_price == 0:
        raise ForbiddenOperationException('Malformed query: price must be different from 0.')
    
    try:
        expense_categories_str = msg["categories"]
    except KeyError as e:
        expense_categories_str = ""
    m = re.match(r'^(\[\d+\])*$', expense_categories_str)
    if not m:
        raise ForbiddenOperationException('Malformed query: categories list must follow the pattern (\\[\\d+\\])*')
    expense_categories = [int(category_str) for category_str in re.findall(r'\[(\d+)\]', expense_categories_str)]
    expense_parent_categories = list()
    
    # Check categories
    if len(expense_categories) != 0:
        all_nodes = dict()
        root_nodes = list()

        conn = sqlite3.connect(DEFAULT_DB)
        with conn:
            c = conn.cursor()
            all_nodes, root_nodes = retrieveTrees(c)
            root_ids = list()
            for category in expense_categories:
                if not category in all_nodes:
                    raise ForbiddenOperationException('Categories must be taken from databases nodes')
                if len(all_nodes[category].children) != 0:
                    raise ForbiddenOperationException('Categories must be leaf nodes')
                root_id = getRootId(root_nodes, category)
                if root_id in root_ids:
                    raise ForbiddenOperationException('Categories must be taken from different trees')
                expense_parent_categories += getPathToNodeFromTrees(root_nodes, category)[1:]
    
    # Save the expense into the database
    conn = sqlite3.connect(DEFAULT_DB)
    with conn:
        c = conn.cursor()
        c.execute('''INSERT INTO expense (title, date, price) VALUES (?, julianday(?), ?)''',
                (expense_title, expense_date_str, expense_price,))
        expense_id = c.lastrowid
        c.executemany('''INSERT INTO node_expense (expense_id, node_id, visible) VALUES (?, ?, 1)''',
                [(expense_id, category,) for category in expense_categories])
        c.executemany('''INSERT INTO node_expense (expense_id, node_id, visible) VALUES (?, ?, 0)''',
                [(expense_id, category,) for category in expense_parent_categories])
        return {"client_id": expense_client_id}
    
    raise ForbiddenOperationException('Unhandled exception')

# XML answers to AJAX queries

def deleteExpense(msg):
    r"""
    Delete an expense from the database
    
    Conditions
    ----------
    - no specific checks, only existing expenses will be destroyed
    """
    
    try:
        expense_id = int(msg["expense_id"])
    except (KeyError, TypeError, ValueError) as e:
        raise ForbiddenOperationException('Malformed query: missing expense_id')

    # Save the expense into the database
    conn = sqlite3.connect(DEFAULT_DB)
    with conn:
        c = conn.cursor()
        c.execute('''DELETE FROM expense WHERE id=?''', (expense_id,))
        c.execute('''DELETE FROM node_expense WHERE expense_id=?''', (expense_id,))
        return {}

    raise ForbiddenOperationException('Unhandled exception')

