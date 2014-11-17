var XML_NODE_ADD_URL = null;
var XML_NODE_UPDATE_URL = null;
var XML_NODE_MOVE_URL = null;

function escapeHtml(unsafe) {
	return $('<div />').text(unsafe).html()
}

function unescapeHtml(safe) {
	return $('<div />').html(safe).text();
}

Array.prototype.sortNodes = function()
{
	this.sort(function(a, b)
	{
		if (a[0] == b[0])
		{
			return 0;
		}
		
		if (a[0] != null && (b[0] == null || a[0] < b[0]))
		{
			return -1;
		}
		else
		{
			return 1;
		}
		return 0;
	});
}

/**
 * Display a tree given a xml root node
 */
function displayTree(node, domNode)
{
	var li = $("<li/>");
	var span = $("<span/>");
	var i = $("<i/>");
	i.addClass("glyphicon");
	span.append(i);
	var escaped_node_title = escapeHtml(node.attr("title"));
	span.append(escaped_node_title);
	span.attr("data-node-id", node.attr("id"));
	span.draggable({
		containment: ".trees",
		revert : true,
		zIndex: 999
	});
	span.droppable({
		accept: 'span[data-node-id]',
		drop: function(event, ui)
		{
			ajaxSaveMoveNode(ui.draggable, $(event.target));
		}
	});
	addOnClickNode(span);
	addOnRightClickNode(span);
	addOnDblClickNode(span);
	li.append(span);
	li.addClass("node");
	var children = node.find("> node");
	if (children.length == 0)
	{
		i.addClass("glyphicon-leaf");
	}
	else
	{
		i.addClass("glyphicon-folder-open");
	}
	displayTrees(children, li);
	domNode.append(li);
	return li;
}

/**
 * Display an editable node
 */
function displayEditNode(domNode)
{
	var li = $("<li/>");
	var span = $("<span/>");
	var input = $("<input/>");
	var i = $("<i/>");
	i.addClass("glyphicon");
	i.addClass("glyphicon-edit");
	span.append(i);
	input.attr("type", "text");
	input.keypress(function(event)
	{
		if (event.keyCode == 13)
		{ // Enter
			ajaxSaveNewNodeValue($(event.currentTarget).parent());
		}
	});
	span.append(input);
	li.append(span);
	domNode.append(li);
	return li;
}

/**
 * Display trees given a list of xml root nodes
 */
function displayTrees(nodes, domNode, root=false)
{
	var ul = $("<ul/>")
	nodes.each(function()
	{
		displayTree($(this), ul);
	});
	liEditNode = displayEditNode(ul);
	if (! root && nodes.length == 0)
	{
		liEditNode.hide();
	}
	sortTree(ul);
	domNode.append(ul);
}

/**
 * Sort the tree nodes
 */
function sortTree(parent_ul)
{
	var nodes = parent_ul.find("> li");
	var nodes_for_sort = new Array();
	for (var i=0 ; i!=nodes.length ; i++)
	{
		nodes_for_sort[i] = [getNodeTitle($(nodes[i])), nodes[i]];
	}
	nodes_for_sort.sortNodes();
	for (var i=0 ; i!=nodes_for_sort.length ; i++)
	{
		parent_ul.append(nodes_for_sort[i][1]);
	}
}
function getNodeTitle(node_li)
{
	var span = node_li.find("> span");
	if (! span.attr("data-node-id"))
	{
		return null;
	}
	else if (span.find("input").length == 0)
	{
		return span.text();
	}
	else
	{
		return span.find("input").first().attr("data-initial-value");
	}
}

/**
 * Create the onclick behaviour for spans in trees
 */
function addOnClickNode(span)
{
	span.on('click', function(e)
	{
		// Nothing for input nodes
		if ($(this).find("input").length == 1)
		{
			return;
		}
		
		// Show/Hide children
		var children = $(this).parent().find("> ul > li");
		var num_nodes = $(this).parent().find("> ul > li.node").length;
		if (children.is(":visible")) {
			children.hide('fast');
			if (num_nodes > 0)
			{
				$(this).attr('title', 'Expand this branch').find('> i')
						.removeClass("glyphicon-folder-open")
						.addClass("glyphicon-folder-close");
			}
		} else {
			children.show('fast');
			if (num_nodes > 0)
			{
				$(this).attr('title', 'Hide this branch').find('> i')
						.removeClass("glyphicon-folder-close")
						.addClass("glyphicon-folder-open");
			}
		}
		
		// Remove edit mode (onclick on different node)
		$(".trees li.node > span > input").each(function()
		{
			cancelEditNodeValue($(this).parent());
		});
		e.stopPropagation();
	});
}
function addOnRightClickNode(span)
{
	span.on('contextmenu', function(e)
	{
		if ($(this).find("input").length == 0)
		{
			// Remove edit mode (onclick on different node)
			$(".trees li.node > span > input").each(function()
			{
				cancelEditNodeValue($(this).parent());
			});
			
			editNodeValue($(this));
		}
		else
		{
			cancelEditNodeValue($(this));
		}
		
		e.stopPropagation();
		return false;
	});
}
function addOnDblClickNode(span)
{
	span.on('dblclick', function(e)
	{
		editNodeValue($(this));
		e.stopPropagation();
	});
}

/**
 * Edit/Cancel edit on node
 */
function editNodeValue(span)
{
	if (span.find("input").length == 0)
	{
		var node_title = span.text();
		var escaped_node_title = escapeHtml(node_title);
		var node_logo = span.children().first();
		span.text("");
		span.append(node_logo);
		var input = $("<input/>");
		input.attr("type", "text");
		input.attr("data-initial-value", escaped_node_title);
		input.val(node_title);
		input.keypress(function(event)
		{
			if (event.keyCode == 27)
			{ // Esc
				cancelEditNodeValue($(event.currentTarget).parent());
				event.stopPropagation();
			}
			else if (event.keyCode == 13)
			{ // Enter
				ajaxSaveEditNodeValue($(event.currentTarget).parent());
			}
		});
		span.append(input);
		input.focus();
		input.select();
	}
}
function cancelEditNodeValue(span)
{
	if (span.find("input").length == 1)
	{
		var node_title = span.find("input").first().attr("data-initial-value");
		var escaped_node_title = escapeHtml(node_title);
		var node_logo = span.children().first();
		span.html("");
		span.append(node_logo);
		span.append(escaped_node_title);
	}
}

/**
 * AJAX query to retrieve and display the trees
 */
function ajaxDisplayTrees(xmlUrl, xmlNodeAddUrl, xmlNodeUpdateUrl, xmlNodeMoveUrl)
{
	XML_NODE_ADD_URL = xmlNodeAddUrl;
	XML_NODE_UPDATE_URL = xmlNodeUpdateUrl;
	XML_NODE_MOVE_URL = xmlNodeMoveUrl;
	$.ajax({
		type: "get",
		url: xmlUrl,
		dataType: "xml",
		success: function(xml)
		{
			var trees = $(xml).find("trees").first();
			displayTrees(trees.find("> node"), $("div.trees"), true);
		}
	});
}

/**
 * AJAX query to save changes to a node
 */
function ajaxSaveEditNodeValue(span)
{
	if (! XML_NODE_UPDATE_URL)
	{
		alert("Unable to find the url");
		return;
	}
	if (span.hasClass("data-ongoing-update"))
	{
		alert("There is already an update for this node");
		return;
	}
	span.addClass("ongoing-update");
	$.ajax({
		type: "post",
		url: XML_NODE_UPDATE_URL,
		data:
		{
			id: span.attr("data-node-id"),
			title: span.find("input").first().val(),
		},
		dataType: "xml",
		success: function(xml)
		{
			var updated_node = $(xml).find("node").first();
			var node_id = updated_node.attr("id");
			var node_title = updated_node.attr("title");
			var escaped_node_title = escapeHtml(node_title);

			var updated_span = $("div.trees span[data-node-id=" + node_id + "]").first();
			var node_logo = updated_span.children().first();
			cancelEditNodeValue(updated_span);
			updated_span.html("");
			updated_span.append(node_logo);
			updated_span.append(escaped_node_title);
			updated_span.removeClass("ongoing-update");

			sortTree(updated_span.parent().parent());
			
			var input = span.find("input");
			input.focus();
			input.val("");
		},
		error: function()
		{
			cancelEditNodeValue(span);
			span.removeClass("ongoing-update");
			alert("Unhandled exception");
		}
	});
}

/**
 * AJAX query to save new node
 */
function ajaxSaveNewNodeValue(span)
{
	if (! XML_NODE_ADD_URL)
	{
		alert("Unable to find the url");
		return;
	}
	$.ajax({
		type: "post",
		url: XML_NODE_ADD_URL,
		data:
		{
			parent_id: span.parent().parent().parent().find("> span").first().attr("data-node-id"),
			title: span.find("input").first().val(),
		},
		dataType: "xml",
		success: function(xml)
		{
			var updated_node = $(xml).find("node").first();
			var parent_id = updated_node.attr("parent_id");
			var node_id = updated_node.attr("id");
			var node_title = updated_node.attr("title");
			var escaped_node_title = escapeHtml(node_title);
			
			var parent_dom = undefined;
			if (parent_id == "-1")
			{
				parent_dom = $("div.trees > ul").first();
			}
			else
			{
				var parent_li = $("div.trees span[data-node-id=" + parent_id + "]").parent();
				if (parent_li.length == 0)
				{
					return;
				}
				var parent_i = parent_li.find("> span > i").first();
				parent_i.removeClass("glyphicon-leaf");
				parent_i.addClass("glyphicon-folder-open");
				parent_dom = parent_li.find("ul").first();
			}
			displayTree($(xml).find("node").first(), parent_dom);
			sortTree(parent_dom);

			var input = span.find("input");
			input.focus();
			input.val("");
		},
		error: function()
		{
			alert("Unhandled exception");
		}
	});
}

/**
 * AJAX query to change node's father
 */
function ajaxSaveMoveNode(span_node, span_father)
{
	if (! XML_NODE_MOVE_URL)
	{
		alert("Unable to find the url");
		return;
	}
	$.ajax({
		type: "post",
		url: XML_NODE_MOVE_URL,
		data:
		{
			id: span_node.attr("data-node-id"),
			parent_id: span_father.attr("data-node-id"),
		},
		dataType: "xml",
		success: function(xml)
		{
		},
		error: function()
		{
			alert("Unhandled exception");
		}
	});
}
