var EXPENSES = new Array();
var $TABLE = null;

function getDirectContributors($node) {
	var contributors = new Array();
	for (var i = 0 ; i != EXPENSES.length ; i++) {
		var expense = EXPENSES[i];
		var expense_from_node = false;
		for (var j = 0 ; j != expense["categories"].length ; j++) {
			expense_from_node |= expense["categories"][j] == $node.attr("id");
		}
		if (expense_from_node) {
			contributors.push(expense);
		}
	}
	return contributors;
}

function getContributors($node) {
	var contributors = getDirectContributors($node);
	for (var i = 0 ; i != $node.children().length ; i++) {
		var subcontributors = getDirectContributors($($node.children()[i]));
		for (var j = 0 ; j != subcontributors.length ; j++) {
			contributors.push(subcontributors);
		}
	}
	return contributors;
}

function computeTotal($node) {
	var total = 0;
	for (var i = 0 ; i != EXPENSES.length ; i++) {
		var expense = EXPENSES[i];
		var expense_from_node = false;
		for (var j = 0 ; j != expense["categories"].length ; j++) {
			expense_from_node |= expense["categories"][j] == $node.attr("id");
		}
		if (expense_from_node) {
			total += expense["price"];
		}
	}
	for (var i = 0 ; i != $node.children().length ; i++) {
		total += computeTotal($($node.children()[i]));
	}
	return total;
}

function loadTrees(nodes, parent_id, depth) {
	for (var i = 0 ; i != nodes.length ; i++) {
		var $node = $(nodes[i]);
		var $tr = $("<tr/>");
		var $td_category = $("<td/>");
		$td_category.text($node.attr("title"));
		$td_category.css("padding-left", (depth*20) + "px");
		var $td_total = $("<td/>");
		$td_total.css("text-align", "right");
		var total = computeTotal($node);
		var language = window.navigator.userLanguage || window.navigator.language;
		$td_total.text(total.toLocaleString(language, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " €");
		$tr.append($td_category);
		$tr.append($td_total);
		if (total == 0 && getContributors($node).length == 0) {
			continue;
		}
		$TABLE.find("tbody").append($tr);
		
		$children = $node.children();
		if ($children.length > 0) {
			loadTrees($children, $node, depth +1);
		} else {
			var contributors = getDirectContributors($node);
			for (var j = 0 ; j != contributors.length ; j++) {
				var $tr = $("<tr/>");
				var $td_category = $("<td/>");
				$td_category.text(contributors[j]["title"]);
				$td_category.css("padding-left", (depth*20+20) + "px");
				var $td_total = $("<td/>");
				$td_total.css("text-align", "right");
				var language = window.navigator.userLanguage || window.navigator.language;
				$td_total.text(contributors[j]["price"].toLocaleString(language, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " €");
				$tr.append($td_category);
				$tr.append($td_total);
				$TABLE.find("tbody").append($tr);
			}
		}
	}
}

function initAddExpensesTable(xmlTreeUrl, expenses, $table) {
	EXPENSES = expenses;
	$TABLE = $table;
	
	$.ajax({
		type: "get",
		url: xmlTreeUrl,
		dataType: "xml",
		success: function(xml)
		{
			$TABLE.find("tbody").children().remove();
			XML_TREES_ELTS = new Array();
			var root_nodes = $(xml).find("trees").first().find("> node");
			loadTrees(root_nodes, undefined, 0);
		}
	});
}

