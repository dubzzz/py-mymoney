#!/usr/bin/python

from tornado.web import RequestHandler
from tornado.escape import xhtml_escape

class ForbiddenOperationException(Exception):
    pass

def donotpropagate_forbidden_operation(method):
    r"""
    Decorate a post or get method for RequestHandler
    Catch all exceptions of type ForbiddenOperationException
    @decorator
    """

    def inner(*args, **kwargs):
        try:
            return method(*args, **kwargs)
        except ForbiddenOperationException:
            return
    return inner

def xmlcontent(method):
    r"""
    Decorate a post or get method for RequestHandler
    Set the content-type to XML
    @decorator
    """

    def inner(*args, **kwargs):
        if len(args) > 0 and isinstance(args[0], RequestHandler):
            request_handler = args[0]
            request_handler.set_header("Content-type", 'text/xml; charset="utf-8"')
        else:
            print("WARNING\txmlcontent only apply to decorate get or post methods of RequestHandler instances")
            print("       \tMethod:    %s" % (method.__name__,))
            print("       \tArguments: %s, %s" % (args, kwargs,))
        return method(*args, **kwargs)
    return inner

def raise404(request_handler, message):
    r"""
    Raise a 404 webpage

    Parameters
    ----------
    request_handler: RequestHandler
        The handler that should launch the 404 error
    message: str
        The message to insert into the xml. This message will be automatically escaped
    
    Raise
    -----
    ForbiddenOperationException: always
    """

    request_handler.set_status(404)
    request_handler.finish('<?xml version="1.0" encoding="UTF-8"?><error>%s</error>' % (xhtml_escape(message),))
    raise ForbiddenOperationException(message)

