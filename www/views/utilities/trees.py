#!/usr/bin/python

class Node:
    def __init__(self, id, title):
        self.id = id
        self.title = title
        self.children = list()
    def append(self, node):
        self.children.append(node)

def isInTree(tree, node_id):
    r"""
    Check if a node is within a given tree

    Parameters
    ----------
    tree: Node
        Tree is defined given its root node
    node_id: int
        The node id to find in the tree

    Return
    ------
    description: True if and only if the node{node_id} is in the tree
    type: bool
    """

    if tree.id == node_id:
        return True
    for child in tree.children:
        if isInTree(child, node_id):
            return True
    return False

def getRootId(trees, node_id):
    r"""
    Find root id

    Parameters
    ----------
    trees: list(Node)
        List of nodes to analyse, one of these nodes can be the root for node_id
    node_id: int
        Id of the node

    Return
    ------
    description: Id of the root node if it detected, -1 otherwise
    type: int
    """

    for root in trees:
        if isInTree(root, node_id):
            return root.id
    return -1

def getPathToNode(tree, node_id):
    r"""
    Build the path towards node (from root node)

    Parameters
    ----------
    tree: Node
        Tree is defined given its root node
    node_id: int
        Id of the node

    Return
    ------
    description: list of nodes ids containing node_id (at the beginning) and its parents up to root_id,
            an empty list if the node node_id is not inside the tree
    type: list(int)
    """
    
    if tree.id == node_id:
        return [node_id]
    for child in tree.children:
        path_to_node = getPathToNode(child, node_id)
        if len(path_to_node) != 0:
            path_to_node.append(tree.id)
            return path_to_node
    return []

def getPathToNodeFromTrees(trees, node_id):
    r"""
    Build the path towards node (from root node)

    Parameters
    ----------
    trees: list(Node)
        List of nodes to analyse, one of these nodes can be the root
        of the tree going to node_id
    node_id: int
        Id of the node

    Return
    ------
    description: list of nodes ids containing node_id (at the beginning) and its parents up to the root node
        an empty list if the node node_id is not inside the trees
    type: list(int)
    """
    
    for root in trees:
        path_to_node = getPathToNode(root, node_id)
        if len(path_to_node) != 0:
            return path_to_node
    return []

def retrieveTrees(c):
    r"""
    Retrieve trees from the database

    Parameters
    ----------
    c: SQL Cursor
        Cursor to access database

    Return
    ------
    description:
        all_nodes: dict(int, Node)
            all_nodes is feeded by this call
            key: child_id
            value: corresponding node instance
        root_nodes: list(Node)
            root_nodes is feeded by this call
            list of root nodes
    type: tuple(all_nodes, root_nodes)
    """

    all_nodes = dict()
    root_nodes = list()
    c.execute('''SELECT id, parent_id, title FROM node''')
    data_db = c.fetchall()
    
    # Initialize nodes list
    for data_line in data_db:
        db_child_id = data_line[0]
        db_parent_id = data_line[1]
        child_title = data_line[2]
        
        node = Node(db_child_id, child_title)
        all_nodes[db_child_id] = node
        if not db_parent_id:
            root_nodes.append(node)
    
    # Create relations
    for data_line in data_db:
        db_child_id = data_line[0]
        db_parent_id = data_line[1]
        if db_parent_id:
            all_nodes[db_parent_id].append(all_nodes[db_child_id])
    
    return (all_nodes, root_nodes,)

