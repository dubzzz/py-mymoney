#!/usr/bin/python
# Launch a very light-HTTP server: Tornado
#
# Requirements (import from):
# - tornado
# - sqlite3
#
# Syntax:
# ./start.py <port=8080>

from tornado.ioloop import IOLoop
from tornado.web import RequestHandler, StaticFileHandler, Application, url
import uimodules
import sqlite3

import sys
from os import path

WWW_PATH = path.dirname(__file__)
SCRIPT_PATH = path.join(WWW_PATH, "scripts/")
TEMPLATE_PATH = path.join(WWW_PATH, "templates/")
STATIC_PATH = path.join(WWW_PATH, "static/")

sys.path.append(SCRIPT_PATH)
from generate_db import DEFAULT_DB

def get_template(name, extension="html"):
    return path.join(TEMPLATE_PATH, "%s.%s" % (name, extension))

class Node:
    def __init__(self, id, title):
        self.id = id
        self.title = title
        self.children = list()
    def append(self, node):
        self.children.append(node)

class ConfigureNodesHandler(RequestHandler):
    def get(self):
        r""" Render trees giving the ability to change its architecture
        """
        
        all_nodes = dict()
        root_nodes = list()
        conn = sqlite3.connect(DEFAULT_DB)
        with conn:
            c = conn.cursor()
            c.execute('''SELECT id, parent_id, title FROM node''')
            data_db = c.fetchall()
            
            # Initialize nodes list
            for data_line in data_db:
                child_id = data_line[0]
                parent_id = data_line[1]
                child_title = data_line[2]
                
                node = Node(child_id, child_title)
                all_nodes[child_id] = node
                if not parent_id:
                    root_nodes.append(node)
            
            # Create relations
            for data_line in data_db:
                child_id = data_line[0]
                parent_id = data_line[1]
                if parent_id:
                    all_nodes[parent_id].append(all_nodes[child_id])
           
        self.render(get_template("configure_nodes"), page="configure_nodes", trees=root_nodes)

class XmlAddNodeHandler(RequestHandler):
    def post(self):
        r""" Add a node with appropriate data
        """
        
        self.set_header("Content-type", 'text/xml; charset="utf-8"')
        
        try:
            parent_id = self.request.arguments["parent_id"][0]
        except KeyError:
            parent_id = None

        try:
            node_title = self.request.arguments["title"][0]
        except KeyError:
            self.set_status(404)
            self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Malformed query: missing title</error>''')
            return

        conn = sqlite3.connect(DEFAULT_DB)
        with conn:
            c = conn.cursor()
            if parent_id is None:
                c.execute('''INSERT INTO node (title) VALUES (?)''', (node_title,))
                node_id = c.lastrowid
                self.render(get_template("xml_update_node", "xml"), id=node_id, title=node_title)
            else:
                c.execute('''INSERT INTO node (parent_id, title) VALUES (?, ?)''',
                        (parent_id, node_title,))
                node_id = c.lastrowid
                self.render(get_template("xml_update_node", "xml"),
                        id=node_id, title=node_title, parent_id=parent_id)
            return

        self.set_status(404)
        self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Unhandled exception</error>''')

class XmlUpdateNodeHandler(RequestHandler):
    def post(self):
        r""" Update a given node with appropriate data
        """
        
        self.set_header("Content-type", 'text/xml; charset="utf-8"')
        
        try:
            node_id = self.request.arguments["id"][0]
        except KeyError:
            self.set_status(404)
            self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Malformed query: missing id</error>''')
            return
        try:
            node_title = self.request.arguments["title"][0]
        except KeyError:
            self.set_status(404)
            self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Malformed query: missing title</error>''')
            return

        conn = sqlite3.connect(DEFAULT_DB)
        with conn:
            c = conn.cursor()
            c.execute('''UPDATE node SET title=? WHERE id=?''', (node_title, node_id,))
            c.execute('''SELECT id, title FROM node WHERE id=?''', (node_id,))
            node_data = c.fetchone()
            
            if node_data is None:
                self.set_status(404)
                self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Unable to find node #%s</error>''' % (node_id,))
                return

            node_id = node_data[0]
            node_title = node_data[1]
            self.render(get_template("xml_update_node", "xml"), id=node_id, title=node_title)
            return

        self.set_status(404)
        self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Unhandled exception</error>''')

class XmlTreesHandler(RequestHandler):
    def get(self):
        r""" Render trees in an XML file
        """
        
        all_nodes = dict()
        root_nodes = list()
        conn = sqlite3.connect(DEFAULT_DB)
        with conn:
            c = conn.cursor()
            c.execute('''SELECT id, parent_id, title FROM node''')
            data_db = c.fetchall()
            
            # Initialize nodes list
            for data_line in data_db:
                child_id = data_line[0]
                parent_id = data_line[1]
                child_title = data_line[2]
                
                node = Node(child_id, child_title)
                all_nodes[child_id] = node
                if not parent_id:
                    root_nodes.append(node)
            
            # Create relations
            for data_line in data_db:
                child_id = data_line[0]
                parent_id = data_line[1]
                if parent_id:
                    all_nodes[parent_id].append(all_nodes[child_id])
           
        self.set_header("Content-type", 'text/xml; charset="utf-8"')
        self.render(get_template("xml_trees", "xml"), trees=root_nodes)

# Define tornado application
settings = {
    "ui_modules": uimodules,
}
application = Application([
    url(r"/configure/nodes", ConfigureNodesHandler, name="configure_nodes"),
    url(r"/xml/trees\.xml", XmlTreesHandler, name="xml_trees"),
    url(r"/xml/add/node\.xml", XmlAddNodeHandler, name="xml_add_node"),
    url(r"/xml/update/node\.xml", XmlUpdateNodeHandler, name="xml_update_node"),
    url(r'/static/(.*)', StaticFileHandler, {'path': STATIC_PATH}),
], **settings)

if __name__ == "__main__":
    if len(sys.argv) != 1 and len(sys.argv) != 2:
        print('''Syntax: ./start.py <port=8080>''')
        exit(1)
    
    try:
        if (len(sys.argv) == 2):
            port = int(sys.argv[1])
        else:
            port = 8080
    except ValueError, e:
        print('''ERROR: {}'''.format(e))
        print('''Syntax: ./start.py <port=8080>''')
        exit(2)
    except TypeError, e:
        print('''ERROR: {}'''.format(e))
        print('''Syntax: ./start.py <port=8080>''')
        exit(3)
    
    # Start the server
    application.listen(port)
    IOLoop.instance().start()

