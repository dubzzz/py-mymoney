from tornado.web import UIModule

class NodeModule(UIModule):
    def render(self, node):
        return self.render_string("xml_render_node.part.xml", node=node)

