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
    def render(self, request_handler):
        return request_handler.render_string(
                get_template('xml_render_node.part', 'xml'),
                parent_node=self, request_handler=request_handler) 

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
        self.render(
                get_template("xml_trees", "xml"),
                trees=root_nodes, request_handler=self)

# Define tornado application
application = Application([
    url(r"/xml/trees\.xml", XmlTreesHandler, name="xml_trees"),
    url(r'/static/(.*)', StaticFileHandler, {'path': STATIC_PATH}),
])

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

