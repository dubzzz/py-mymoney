#!/usr/bin/python

# This script has to generate the sqlite database
#
# Requirements (import from):
#   -  sqlite3
#
# Syntax:
#   ./generate_db.py

import sqlite3

import sys
from os import path
SCRIPT_PATH = path.dirname(__file__)
DEFAULT_DB = path.join(SCRIPT_PATH, "../mymoney.db")

def generate_tables(db=DEFAULT_DB):
    conn = sqlite3.connect(db)
    
    with conn:
        c = conn.cursor()
        
        # Drop tables if they exist
        c.execute('''DROP TABLE IF EXISTS node''')
        c.execute('''DROP TABLE IF EXISTS expense''')
        c.execute('''DROP TABLE IF EXISTS node_expense''')
        c.execute('''DROP TABLE IF EXISTS sessions''')
        
        # Create tables
        c.execute('''CREATE TABLE IF NOT EXISTS node (
                        id INTEGER PRIMARY KEY,
                        parent_id INTEGER,
                        title TEXT NOT NULL,
                        FOREIGN KEY(parent_id) REFERENCES node(id))''')
        c.execute('''CREATE TABLE IF NOT EXISTS expense (
                        id INTEGER PRIMARY KEY,
                        title TEXT NOT NULL,
                        date INTEGER NOT NULL,
                        value REAL NOT NULL)''')
        c.execute('''CREATE TABLE IF NOT EXISTS node_expense (
                        expense_id INTEGER,
                        node_id INTEGER,
                        PRIMARY KEY(expense_id, node_id),
                        FOREIGN KEY(expense_id) REFERENCES expense(id),
                        FOREIGN KEY(node_id) REFERENCES node(id))''')
        c.execute('''CREATE TABLE IF NOT EXISTS sessions (
                        ip TEXT NOT NULL,
                        key TEXT NOT NULL,
                        expiry_datetime INTEGER NOT NULL,
                        value TEXT,
                        PRIMARY KEY(ip, key))''')
        
        # Commit the changes
        conn.commit()

if __name__ == '__main__':
    generate_tables(DEFAULT_DB)
