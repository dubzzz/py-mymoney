#!/usr/bin/python
#
# Requirements (import from):
# - tornado
# - sqlite3

from tornado.web import RequestHandler
import sqlite3

import sys
from os import path

WWW_PATH = path.dirname(__file__)
SCRIPT_PATH = path.join(WWW_PATH, "scripts/")
TEMPLATE_PATH = path.join(WWW_PATH, "templates/")
STATIC_PATH = path.join(WWW_PATH, "static/")

sys.path.append(SCRIPT_PATH)
from generate_db import DEFAULT_DB

def read_session(handler):
    r'''
    Build the session dictionnary
    handler: RequestHandler associated to the query
    '''
    conn = sqlite3.connect(DEFAULT_DB)
    with conn:
        c = conn.cursor()
        c.execute('''SELECT key, value FROM sessions
                        WHERE expiry_datetime > datetime('now') AND ip = ?''', (handler.request.remote_ip,))
        return dict(c.fetchall())
    raise Exception("Unable to read from the database")

def store_session(handler, key, value):
    r'''
    Store and/or update an existing session variable
    handler: RequestHandler associated to the query
    key    : session key to create/update
    value  : value associated to the session key
    '''
    conn = sqlite3.connect(DEFAULT_DB)
    with conn:
        c = conn.cursor()
        c.execute('''REPLACE INTO sessions (ip, key, value, expiry_datetime)
                        VALUES (?,?,?,datetime('now', '+30 minutes'))''', (handler.request.remote_ip, key, value))
    
