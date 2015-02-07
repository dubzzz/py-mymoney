#!/usr/bin/python

from tornado.web import RequestHandler

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

