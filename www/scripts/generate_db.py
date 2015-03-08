#!/usr/bin/python

# This script has to generate the sqlite database
#
# Requirements (import from):
#   -  sqlite3
#
# Syntax:
#   ./generate_db.py

import sqlite3

import hashlib
import getpass
import sys
from os import path, urandom
SCRIPT_PATH = path.dirname(__file__)
DEFAULT_DB = path.join(SCRIPT_PATH, "../mymoney.db")

def generate_tables(db=DEFAULT_DB):
    conn = sqlite3.connect(db)
    
    with conn:
        c = conn.cursor()
        
        # Drop tables if they exist
        #c.execute('''DROP TABLE IF EXISTS node''')
        #c.execute('''DROP TABLE IF EXISTS expense''')
        #c.execute('''DROP TABLE IF EXISTS node_expense''')
        #c.execute('''DROP TABLE IF EXISTS users''')
        
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
                        price REAL NOT NULL)''')
        c.execute('''CREATE TABLE IF NOT EXISTS node_expense (
                        expense_id INTEGER NOT NULL,
                        node_id INTEGER NOT NULL,
                        visible BOOLEAN NOT NULL,
                        PRIMARY KEY(expense_id, node_id),
                        FOREIGN KEY(expense_id) REFERENCES expense(id),
                        FOREIGN KEY(node_id) REFERENCES node(id))''')
        c.execute('''CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY,
                        username TEXT NOT NULL,
                        password TEXT NOT NULL,
                        salt TEXT NOT NULL)''')
        
        # Commit the changes
        conn.commit()

if __name__ == '__main__':
    generate_tables(DEFAULT_DB)
    
    if sys.version_info < (3, 0):
        username = raw_input("Username: ")
    else:
        username = input("Username: ")
    ask_password = True
    while ask_password:
        ask_password = False
        password = getpass.getpass("Enter your password: ")
        cpassword = getpass.getpass("Enter your password (confirmation): ")
        if password != cpassword:
            ask_password = True
            print("Passwords differ")
    conn = sqlite3.connect(DEFAULT_DB)
    with conn:
        c = conn.cursor()
        salt = urandom(16).encode('hex')
        h = hashlib.sha1()
        h.update(salt+password)
        hashvalue= h.hexdigest()
        c.execute('''DELETE FROM users WHERE username=?''', (username,))
        c.execute('''INSERT INTO users (username, password, salt)
                        VALUES (?, ?, ?)''', (username, hashvalue, salt));

