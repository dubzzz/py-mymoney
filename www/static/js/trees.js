function escapeHtml(unsafe) {
	return $('<div />').text(unsafe).html()
}

function unescapeHtml(safe) {
	return $('<div />').html(safe).text();
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
	addOnClickNode(span);
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
	span.append(input);
	li.append(span);
	domNode.append(li);
	return li;
}

/**
 * Display trees given a list of xml root nodes
 */
function displayTrees(nodes, domNode)
{
	var ul = $("<ul/>")
	nodes.each(function()
	{
		displayTree($(this), ul);
	});
	liEditNode = displayEditNode(ul);
	if (nodes.length == 0)
	{
		liEditNode.hide();
	}
	domNode.append(ul);
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
		input.attr("value", node_title);
		input.attr("data-initial-value", escaped_node_title);
		input.keypress(function(event)
		{
			if (event.keyCode == 27)
			{ // Esc
				cancelEditNodeValue($(event.currentTarget).parent());
				event.stopPropagation();
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
function ajaxDisplayTrees(xmlUrl)
{
	$.ajax({
		type: "get",
		url: xmlUrl,
		dataType: "xml",
		success: function(xml)
		{
			var trees = $(xml).find("trees").first();
			displayTrees(trees.find("> node"), $("div.trees"));
		}
	});
}
