#!/usr/bin/python

from tornado.web import RequestHandler
import sqlite3

from calendar import monthrange
import re
import sys
from os import path

__CURRENT_PATH = path.dirname(__file__)

sys.path.append(path.join(__CURRENT_PATH, "..", "scripts"))
from generate_db import DEFAULT_DB

sys.path.append(path.join(__CURRENT_PATH, "utilities"))
from request_helper import xmlcontent, raise404, donotpropagate_forbidden_operation

# HTML Webpages

class AddExpensesHandler(RequestHandler):
    def get(self):
        r"""
        Form to give the ability to add several expenses
        """
        
        self.render("add_expenses.html", page="add_expenses")

# XML answers to AJAX queries

class XmlAddExpenseHandler(RequestHandler):
    @xmlcontent
    @donotpropagate_forbidden_operation
    def post(self):
        r"""
        Add an expense to the database
        """
        
        try:
            expense_client_id = int(self.request.arguments["client_id"][0])
        except (KeyError, IndexError, TypeError, ValueError) as e:
            expense_client_id = -1

        try:
            expense_title = self.request.arguments["title"][0].decode('utf_8')
        except (KeyError, IndexError) as e:
            raise404(self, 'Malformed query: missing title')
        
        try:
            expense_date_str = self.request.arguments["date"][0].decode('utf_8')
        except (KeyError, IndexError) as e:
            raise404(self, 'Malformed query: missing date')
        m = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})$', expense_date_str)
        if not m:
            raise404(self, 'Malformed query: invalid date format (yyyy-mm-dd)')
        expense_date_year = int(m.group(1))
        expense_date_month = int(m.group(2))
        expense_date_day = int(m.group(3))
        if expense_date_month < 1 or expense_date_month > 12:
            raise404(self, 'Malformed query: invalid date (month 1-12)')
        if expense_date_day < 1 or expense_date_day > monthrange(expense_date_year, expense_date_month)[1]:
            raise404(self, 'Malformed query: invalid date (day 1-%d)' % (monthrange(expense_date_year, expense_date_month)[1],))
        
        try:
            expense_price = float(self.request.arguments["price"][0])
        except (KeyError, IndexError, TypeError, ValueError) as e:
            raise404(self, 'Malformed query: missing price')
        if expense_price == 0:
            raise404(self, 'Malformed query: price must be different from 0.')

        conn = sqlite3.connect(DEFAULT_DB)
        with conn:
            c = conn.cursor()
            c.execute('''INSERT INTO expense (title, date, price) VALUES (?, julianday(?), ?)''',
                    (expense_title, expense_date_str, expense_price,))
            self.render("xml_add_expense.xml", client_id=expense_client_id)
            return
        raise404(self, 'Unhandled exception')

