#!/usr/bin/python

from tornado.web import RequestHandler

import sys
from os import path

__CURRENT_PATH = path.dirname(__file__)

sys.path.append(path.join(__CURRENT_PATH, "..", "scripts"))
from generate_db import DEFAULT_DB

# HTML Webpages

class AddExpensesHandler(RequestHandler):
    def get(self):
        r"""
        Form to give the ability to add several expenses
        """
        
        self.render("add_expenses.html", page="add_expenses")

# XML answers to AJAX queries

