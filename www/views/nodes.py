#!/usr/bin/python

from tornado.web import RequestHandler
import sqlite3

import sys
from os import path

__CURRENT_PATH = path.dirname(__file__)

sys.path.append(path.join(__CURRENT_PATH, "..", "scripts"))
from generate_db import DEFAULT_DB

sys.path.append(path.join(__CURRENT_PATH, "utilities"))
from trees import Node, isInTree, getRootId

# HTML Webpages

class ConfigureNodesHandler(RequestHandler):
    def get(self):
        r"""
        Render the trees currently saved into the database,
        give the ability for the user to change its architecture
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
           
        self.render("configure_nodes.html", page="configure_nodes", trees=root_nodes)

# XML answers to AJAX queries

class XmlAddNodeHandler(RequestHandler):
    def post(self):
        r"""
        Creation of a new node with appropriate data

        Conditions
        ----------
        - if a parent_id has been specified,
            - the parent is in the database
        """
        
        self.set_header("Content-type", 'text/xml; charset="utf-8"')
        
        try:
            parent_id = int(self.request.arguments["parent_id"][0])
        except (KeyError, IndexError, TypeError, ValueError) as e:
            parent_id = None
        try:
            node_title = self.request.arguments["title"][0].decode('utf_8')
        except (KeyError, IndexError) as e:
            self.set_status(404)
            self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Malformed query: missing title</error>''')
            return

        conn = sqlite3.connect(DEFAULT_DB)
        with conn:
            c = conn.cursor()
            if parent_id is None:
                c.execute('''INSERT INTO node (title) VALUES (?)''', (node_title,))
                node_id = c.lastrowid
                self.render("xml_update_node.xml", id=node_id, title=node_title)
            else:
                c.execute('''SELECT id FROM node WHERE id=?''', (parent_id,))
                if c.fetchone() == None:
                    self.set_status(404)
                    self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Parent node does not exist</error>''')
                    return
                c.execute('''INSERT INTO node (parent_id, title) VALUES (?, ?)''',
                        (parent_id, node_title,))
                node_id = c.lastrowid
                self.render("xml_update_node.xml", id=node_id, title=node_title, parent_id=parent_id)
            return

        self.set_status(404)
        self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Unhandled exception</error>''')

class XmlUpdateNodeHandler(RequestHandler):
    def post(self):
        r"""
        Update a given node with appropriate data

        Conditions
        ----------
        - node_id is in the database
        """
        
        self.set_header("Content-type", 'text/xml; charset="utf-8"')
        
        try:
            node_id = int(self.request.arguments["id"][0])
        except (KeyError, IndexError, TypeError, ValueError) as e:
            self.set_status(404)
            self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Malformed query: missing id</error>''')
            return
        try:
            node_title = self.request.arguments["title"][0].decode('utf_8')
        except (KeyError, IndexError) as e:
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
                self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Unable to find node</error>''')
                return

            node_id = node_data[0]
            node_title = node_data[1]
            self.render("xml_update_node.xml", id=node_id, title=node_title)
            return

        self.set_status(404)
        self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Unhandled exception</error>''')

class XmlMoveNodeHandler(RequestHandler):
    def post(self):
        r"""
        Move a given node to another parent
        
        Conditions
        ----------
        - nodes are already in the database
        - nodes are in the same tree
        - new father is not a child of the node
        """
        
        self.set_header("Content-type", 'text/xml; charset="utf-8"')
        
        try:
            node_id = int(self.request.arguments["id"][0])
        except (KeyError, IndexError, TypeError, ValueError) as e:
            self.set_status(404)
            self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Malformed query: missing id</error>''')
            return
        try:
            parent_id = int(self.request.arguments["parent_id"][0])
        except (KeyError, IndexError, TypeError, ValueError) as e:
            self.set_status(404)
            self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Malformed query: missing parent_id</error>''')
            return

        conn = sqlite3.connect(DEFAULT_DB)
        with conn:
            c = conn.cursor()

            # Retrieve the full tree
            # in order to check conditions
            
            all_nodes = dict()
            root_nodes = list()
            c.execute('''SELECT id, parent_id, title FROM node''')
            data_db = c.fetchall()
            
            # Initialize nodes list
            for data_line in data_db:
                db_child_id = data_line[0]
                db_parent_id = data_line[1]
                
                node = Node(db_child_id, None)
                all_nodes[db_child_id] = node
                if not db_parent_id:
                    root_nodes.append(node)
            
            # Create relations
            for data_line in data_db:
                db_child_id = data_line[0]
                db_parent_id = data_line[1]
                if db_parent_id:
                    all_nodes[db_parent_id].append(all_nodes[db_child_id])
            
            # Check conditions
            
            try:
                all_nodes[parent_id]
            except KeyError:
                self.set_status(404)
                self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Forbidden move: unknown parent node</error>''')
                return
            try:
                all_nodes[node_id]
            except KeyError:
                self.set_status(404)
                self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Forbidden move: unknown node</error>''')
                return
            
            if isInTree(all_nodes[node_id], parent_id):
                self.set_status(404)
                self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Forbidden move: unable to be a child of your own children</error>''')
                return
            
            if getRootId(root_nodes, node_id) != getRootId(root_nodes, parent_id):
                self.set_status(404)
                self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Forbidden move: unable to move from a tree to another one</error>''')
                return
            
            c.execute('''UPDATE node SET parent_id=? WHERE id=?''', (parent_id, node_id,))
            c.execute('''SELECT id, parent_id FROM node WHERE id=?''', (node_id,))
            node_data = c.fetchone()
            
            if node_data is None:
                self.set_status(404)
                self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Unable to find node</error>''')
                return

            node_id = node_data[0]
            node_parent_id = node_data[1]
            self.render("xml_update_node.xml", id=node_id, parent_id=node_parent_id)
            return

        self.set_status(404)
        self.finish('''<?xml version="1.0" encoding="UTF-8"?><error>Unhandled exception</error>''')

class XmlTreesHandler(RequestHandler):
    def get(self):
        r"""
        Render trees in an XML file
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
        self.render("xml_trees.xml", trees=root_nodes)

