#!/usr/bin/python

from tornado.web import RequestHandler, authenticated
from auth import BaseHandler
import sqlite3

import sys
from os import path

__CURRENT_PATH = path.dirname(__file__)

sys.path.append(path.join(__CURRENT_PATH, "..", "scripts"))
from generate_db import DEFAULT_DB

sys.path.append(path.join(__CURRENT_PATH, "utilities"))
from request_helper import xmlcontent, raise404, donotpropagate_forbidden_operation
from trees import Node, isInTree, getRootId, retrieveTrees

# HTML Webpages

class ConfigureNodesHandler(BaseHandler):
    @authenticated
    def get(self):
        r"""
        Render the trees currently saved into the database,
        give the ability for the user to change its architecture
        """
        
        self.xsrf_token
        self.render("configure_nodes.html", page="configure_nodes")

# XML answers to AJAX queries

class XmlAddNodeHandler(RequestHandler):
    @xmlcontent
    @donotpropagate_forbidden_operation
    def post(self):
        r"""
        Creation of a new node with appropriate data

        Conditions
        ----------
        - if a parent_id has been specified,
            - the parent is in the database
        """
        
        try:
            parent_id = int(self.request.arguments["parent_id"][0])
        except (KeyError, IndexError, TypeError, ValueError) as e:
            parent_id = None
        try:
            node_title = self.request.arguments["title"][0].decode('utf_8')
        except (KeyError, IndexError) as e:
            raise404(self, 'Malformed query: missing title')

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
                    raise404(self, 'Parent node does not exist')
                c.execute('''INSERT INTO node (parent_id, title) VALUES (?, ?)''',
                        (parent_id, node_title,))
                node_id = c.lastrowid
                self.render("xml_update_node.xml", id=node_id, title=node_title, parent_id=parent_id)
            return
        raise404(self, 'Unhandled exception')

class XmlUpdateNodeHandler(RequestHandler):
    @xmlcontent
    @donotpropagate_forbidden_operation
    def post(self):
        r"""
        Update a given node with appropriate data

        Conditions
        ----------
        - node_id is in the database
        """
        
        try:
            node_id = int(self.request.arguments["id"][0])
        except (KeyError, IndexError, TypeError, ValueError) as e:
            raise404(self, 'Malformed query: missing id')
        try:
            node_title = self.request.arguments["title"][0].decode('utf_8')
        except (KeyError, IndexError) as e:
            raise404(self, 'Malformed query: missing title')

        conn = sqlite3.connect(DEFAULT_DB)
        with conn:
            c = conn.cursor()
            c.execute('''UPDATE node SET title=? WHERE id=?''', (node_title, node_id,))
            c.execute('''SELECT id, title FROM node WHERE id=?''', (node_id,))
            node_data = c.fetchone()
            
            if node_data is None:
                raise404(self, 'Unable to find node')

            node_id = node_data[0]
            node_title = node_data[1]
            self.render("xml_update_node.xml", id=node_id, title=node_title)
            return
        raise404(self, 'Unhandled exception')

class XmlMoveNodeHandler(RequestHandler):
    @xmlcontent
    @donotpropagate_forbidden_operation
    def post(self):
        r"""
        Move a given node to another parent
        
        Conditions
        ----------
        - nodes are already in the database
        - nodes are in the same tree
        - new father is not a child of the node
        """
        
        try:
            node_id = int(self.request.arguments["id"][0])
        except (KeyError, IndexError, TypeError, ValueError) as e:
            raise404(self, 'Malformed query: missing id')
        try:
            parent_id = int(self.request.arguments["parent_id"][0])
        except (KeyError, IndexError, TypeError, ValueError) as e:
            raise404(self, 'Malformed query: missing parent_id')

        conn = sqlite3.connect(DEFAULT_DB)
        with conn:
            c = conn.cursor()

            # Retrieve the full tree
            # in order to check conditions
            
            all_nodes, root_nodes = retrieveTrees(c)
            
            # Check conditions
            
            try:
                all_nodes[parent_id]
            except KeyError:
                raise404(self, 'Forbidden move: unknown parent node')
            try:
                all_nodes[node_id]
            except KeyError:
                raise404(self, 'Forbidden move: unknown node')
            
            if isInTree(all_nodes[node_id], parent_id):
                raise404(self, 'Forbidden move: unable to be a child of your own children')
            
            if getRootId(root_nodes, node_id) != getRootId(root_nodes, parent_id):
                raise404(self, 'Forbidden move: unable to move from a tree to another one')
            
            c.execute('''UPDATE node SET parent_id=? WHERE id=?''', (parent_id, node_id,))
            c.execute('''SELECT id, parent_id FROM node WHERE id=?''', (node_id,))
            node_data = c.fetchone()
            
            if node_data is None:
                raise404(self, 'Unable to find node')

            node_id = node_data[0]
            node_parent_id = node_data[1]
            self.render("xml_update_node.xml", id=node_id, parent_id=node_parent_id)
            return
        raise404(self, 'Unhandled exception')

class XmlTreesHandler(RequestHandler):
    @xmlcontent
    def get(self):
        r"""
        Render trees in an XML file
        """
        
        all_nodes = dict()
        root_nodes = list()
        conn = sqlite3.connect(DEFAULT_DB)
        with conn:
            c = conn.cursor()
            all_nodes, root_nodes = retrieveTrees(c)
           
        self.render("xml_trees.xml", trees=root_nodes)

