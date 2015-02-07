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

