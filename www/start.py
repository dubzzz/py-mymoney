#!/usr/bin/python
# Launch a very light-HTTP server: Tornado
#
# Syntax:
# ./start.py <port=8080>

from tornado.ioloop import IOLoop
from tornado.web import RequestHandler, StaticFileHandler, Application, url

import sys
from os import path

__CURRENT_PATH = path.dirname(__file__)
__CURRENT_ABSPATH = path.dirname(path.realpath(__file__))
__STATIC_ABSPATH = path.join(__CURRENT_ABSPATH, "static")
__TEMPLATES_ABSPATH = path.join(__CURRENT_ABSPATH, "templates")

sys.path.append(path.join(__CURRENT_PATH, "views", "utilities"))
import uimodules

sys.path.append(path.join(__CURRENT_PATH, "views"))
from expenses import AddExpensesHandler, XmlAddExpenseHandler, XmlDeleteExpenseHandler, DisplayExpensesHandler
from nodes import ConfigureNodesHandler, XmlTreesHandler, XmlAddNodeHandler, XmlUpdateNodeHandler, XmlMoveNodeHandler

# Define tornado application
settings = {
    "template_path": __TEMPLATES_ABSPATH,
    "ui_modules": uimodules,
    "xsrf_cookies": True,
}
application = Application([
    url(r"/configure/nodes", ConfigureNodesHandler, name="configure_nodes"),
    url(r"/add/expenses", AddExpensesHandler, name="add_expenses"),
    url(r"/display/expenses", DisplayExpensesHandler, name="display_expenses"),
    url(r"/xml/trees\.xml", XmlTreesHandler, name="xml_trees"),
    url(r"/xml/add/expense\.xml", XmlAddExpenseHandler, name="xml_add_expense"),
    url(r"/xml/add/node\.xml", XmlAddNodeHandler, name="xml_add_node"),
    url(r"/xml/delete/expense\.xml", XmlDeleteExpenseHandler, name="xml_delete_expense"),
    url(r"/xml/update/node\.xml", XmlUpdateNodeHandler, name="xml_update_node"),
    url(r"/xml/move/node\.xml", XmlMoveNodeHandler, name="xml_move_node"),
    url(r'/static/(.*)', StaticFileHandler, {'path': __STATIC_ABSPATH}),
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

