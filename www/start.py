#!/usr/bin/python
# Launch a very light-HTTP server: Tornado
#
# Syntax:
# ./start.py <port=8080>

from tornado.ioloop import IOLoop
from tornado.web import asynchronous, RequestHandler, StaticFileHandler, Application, url
from tornado.websocket import WebSocketHandler

import json
import sys
from os import path
from config import COOKIE_SECRET

__CURRENT_PATH = path.dirname(__file__)
__CURRENT_ABSPATH = path.dirname(path.realpath(__file__))
__STATIC_ABSPATH = path.join(__CURRENT_ABSPATH, "static")
__TEMPLATES_ABSPATH = path.join(__CURRENT_ABSPATH, "templates")

sys.path.append(path.join(__CURRENT_PATH, "views", "utilities"))
import uimodules
from request_helper import ForbiddenOperationException

sys.path.append(path.join(__CURRENT_PATH, "views"))
from auth import LoginHandler, LogoutHandler
from expenses import AddExpensesHandler, DisplayExpensesHandler, DisplayTreeExpensesHandler, addExpense, deleteExpense
from nodes import ConfigureNodesHandler, XmlTreesHandler, XmlAddNodeHandler, XmlUpdateNodeHandler, XmlMoveNodeHandler

# WebsocketHandler definition
clients = list()
class MyMoneyWebSocketHandler(WebSocketHandler):
    def get_current_user(self):
        return self.get_secure_cookie("username")
    
    def remove(self):
        r""" Remove the user from the list of available users """
        try:
            clients.remove(self)
        except ValueError:
            pass

    def open(self, *args):
        r""" Open the websocket for allowed users only """
        if self.current_user is None:
            self.close()
            return
        clients.append(self)
    
    def on_message(self, message):
        r""" Receive messages from allowed users only, remove the others """
        if self.current_user is None:
            self.remove()
            self.close()
            return
        
        try:
            content = json.loads(message)
        except:
            self.write_message(
                    json.dumps(
                    {
                        "aim": "response",
                        "id": -1,
                        "status": "error",
                        "message": "Unable to handle the query [invalid JSON]"}))

        try:
            aim = content["aim"]
        except KeyError as e:
            self.write_message(
                    json.dumps(
                    {
                        "aim": "response",
                        "id": -1,
                        "status": "error",
                        "message": "Unable to handle the query [no aim specified]"}))

        if aim == "ping":
            return

        status = "success"
        response = None
        try:
            if aim == "add-expense":
                response = addExpense(content["message"])
            elif aim == "delete-expense":
                response = deleteExpense(content["message"])
        except KeyError as e:
            status = "error"
            response = "No data has been transfered"
        except ForbiddenOperationException as e:
            status = "error"
            response = e.message
        
        self.write_message(
                json.dumps(
                {
                    "aim": "response",
                    "id": content["id"],
                    "status": status,
                    "message": response}))
    
    def on_close(self):
        r""" Close websocket and remove from list of available users """
        self.remove()

# Define tornado application
settings = {
    "cookie_secret": COOKIE_SECRET,
    "login_url": "/login",
    "template_path": __TEMPLATES_ABSPATH,
    "ui_modules": uimodules,
    "xsrf_cookies": True,
}
application = Application([
    url(r"/", DisplayTreeExpensesHandler, name="home"),
    url(r"/login", LoginHandler, name="login"),
    url(r"/logout", LogoutHandler, name="logout"),
    url(r"/configure/nodes", ConfigureNodesHandler, name="configure_nodes"),
    url(r"/add/expenses", AddExpensesHandler, name="add_expenses"),
    url(r"/display/expenses", DisplayExpensesHandler, name="display_expenses"),
    url(r"/display/tree/expenses", DisplayTreeExpensesHandler, name="display_tree_expenses"),
    url(r"/xml/trees\.xml", XmlTreesHandler, name="xml_trees"),
    url(r"/xml/add/node\.xml", XmlAddNodeHandler, name="xml_add_node"),
    url(r"/xml/update/node\.xml", XmlUpdateNodeHandler, name="xml_update_node"),
    url(r"/xml/move/node\.xml", XmlMoveNodeHandler, name="xml_move_node"),
    url(r"/ws/", MyMoneyWebSocketHandler, name="websocket"),
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

