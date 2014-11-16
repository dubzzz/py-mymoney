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
	span.append(node.attr("title"));
	addOnClickNode(span);
	li.append(span);
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
}

/**
 * Display trees given a list of xml root nodes
 */
function displayTrees(nodes, domNode)
{
	if (nodes.length == 0)
	{
		return;
	}
	var ul = $("<ul/>")
	nodes.each(function()
	{
		displayTree($(this), ul);
	});
	domNode.append(ul);
}

/**
 * Create the onclick behaviour for spans in trees
 */
function addOnClickNode(span)
{
	span.on('click', function(e)
	{
		var children = $(this).parent().find("> ul > li");
		if (children.length == 0)
		{
			return;
		}
		if (children.is(":visible")) {
			children.hide('fast');
			$(this).attr('title', 'Expand this branch').find('> i')
					.removeClass("glyphicon-folder-open")
					.addClass("glyphicon-folder-close");
		} else {
			children.show('fast');
			$(this).attr('title', 'Hide this branch').find('> i')
					.removeClass("glyphicon-folder-close")
					.addClass("glyphicon-folder-open");
		}
		e.stopPropagation();
	});
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
