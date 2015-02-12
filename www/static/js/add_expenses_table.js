var XML_EXPENSE_ADD_URL = null;
var ADD_EXPENSES_TABLE = null;
var XML_TREES_ELTS = new Array();
var AUTOCOMPLETE_TITLES = new Array();
var LAST_EXPENSE_ID = 0;
var unitializedCategories = new Array();

function readExpenseDate(expense) {
	var date_input = expense.find("input.date-input");
	if (date_input.length != 1) {
		return undefined;
	}
	if (date_input[0].type == "date") {
		if (date_input.val().match('^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$')) {
			return date_input.val();
		}
	} else { //text
		var m = date_input.val().match('^([0-9]{1,2})/([0-9]{1,2})/([0-9]{4})$');
		if (m) {
			return m[3] + '-' + m[2] + '-' + m[1];
		}
	}
	return undefined;
}

function readExpenseTitle(expense) {
	var title_input = expense.find("input.title-input");
	if (title_input.length != 1 || title_input.val().length == 0) {
		return undefined;
	}
	return title_input.val();
}

function readExpensePrice(expense) {
	var price_input = expense.find("input.price-input");
	if (price_input.length != 1
				|| ! price_input.val().match('^[-+]?(([0-9]{1,3}([, ][0-9]{3})*|[0-9]+)(.[0-9]?[0-9]?)?)$')
				|| parseFloat(price_input.val().replace(/ /g, '').replace(/,/g, '')) == 0) {
		return undefined;
	}
	return parseFloat(price_input.val().replace(/ /g, '').replace(/,/g, ''));
}

function readExpenseCategories(expense) {
	var categories_elt = expense.find(".categories-data ul.autocomplete-selection li");
	var categories = new Array();
	for (var i = 0 ; i != categories_elt.length ; i++) {
		categories.push($(categories_elt[i]).attr("data-id"));
	}
	return categories;
}

function isFilledExpense(expense) {
	// Given an expense, return true is it is fully and correctly filled
	
	var expense_date = readExpenseDate(expense);
	if (! expense_date) {
		return undefined;
	}
	
	var expense_title = readExpenseTitle(expense);
	if (! expense_title) {
		return undefined;
	}
	
	var expense_price = readExpensePrice(expense);
	if (! expense_price) {
		return undefined;
	}

	var expense_categories = readExpenseCategories(expense);

	return {
		date: expense_date,
		title: expense_title,
		price: expense_price,
		categories: expense_categories
	};
}

function reactOnExpenseChange() {
	// Automaticcaly append expenses when the last line is fully filled
	// Only the last line is checked
	
	var expense = $(this).parent().parent();
	// expense is the last expense of the table is not equivalent to
	// data-expense-identifier == LAST_EXPENSE_ID as the expense could have been deleted..
	if (expense[0] == ADD_EXPENSES_TABLE.children().last()[0] && isFilledExpense(expense)) {
		appendExpense();
	}
}

function reactOnPriceFocusOut() {
	// Automatically format the price on focus out action
	
	var price_value = readExpensePrice($(this).parent().parent());
	if (! price_value) {
		return false;
	}
	
	var price_value_str = $(this).val();
	var price_value_new_str = price_value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

	var language = window.navigator.userLanguage || window.navigator.language;
	if (language.toLowerCase() == 'fr' || language.toLowerCase() == 'fr-fr') {
		price_value_new_str = price_value_new_str.replace(/,/g, ' ');
	}
	if (price_value_str != price_value_new_str) {
		$(this).val(price_value_new_str);
	}
}

function reactOnPriceFocus() {
	// Automatically format the price on focus in order to ease the modification
	
	var price_value = readExpensePrice($(this).parent().parent());
	if (! price_value) {
		return false;
	}
	
	var price_value_str = $(this).val();
	var price_value_new_str = price_value.toFixed(2);
	if (price_value_str != price_value_new_str) {
		$(this).val(price_value_new_str);
	}
}

function reactOnSelectCategory($input, choice) {
	var $selection = $input.parent().find("ul.autocomplete-selection");
	if ($selection.length == 0) {
		$selection = $("<ul/>");
		$selection.addClass("autocomplete-selection");
		$input.parent().append($selection);
	}
	var $elt_dom = $("<li/>");
	$elt_dom.attr("data-id", choice['autocomplete_id']);
	$elt_dom.attr("title", choice['autocomplete_rawdata_on']);
	$elt_dom.html(toSafeHtml(choice['autocomplete_rawdata_after']) + " &times;");
	$elt_dom.click(function() {
		var $selection = $(this).parent();
		$(this).remove();
		if ($selection.children().length == 0) {
			$selection.remove();
		}
	});
	$selection.append($elt_dom);
}

function reactOnSelectTitle($input, choice) {
	$input.val(choice["autocomplete_rawdata_on"]);
}

function appendExpense() {
	// Append an empty expense in the form
	
	LAST_EXPENSE_ID++;
	var expense = $("<tr/>");
	expense.addClass('expense-edit');
	expense.attr("data-expense-identifier", LAST_EXPENSE_ID);
	
	var date_td = $("<td/>");
	var date_input_desc = $("<span/>");
	date_input_desc.addClass("glyphicon glyphicon-calendar");
	var date_input = $("<input/>");
	date_input.addClass("date-input");
	date_input.attr("required", "");
	date_input.attr("type", "date");
	if (date_input[0].type == "text") //date type not supported (HTML5)
	{
		date_input.attr("placeholder", "dd/mm/yyyy");
		date_input.datepicker({dateFormat: "dd/mm/yy"});
	}
	date_input.change(reactOnExpenseChange);
	date_input.keyup(reactOnExpenseChange);
	date_td.append(date_input_desc);
	date_td.append(date_input);
	expense.append(date_td);

	var title_td = $("<td/>");
	var title_input = $("<input/>");
	title_input.addClass("title-input");
	title_input.attr("required", "");
	title_input.attr("size", "50");
	title_input.attr("type", "text");
	title_input.attr("placeholder", "Short description of the expense");
	title_input.keyup(reactOnExpenseChange);
	var autocomp_title = new AutocompleteItem(title_input, AUTOCOMPLETE_TITLES);
	autocomp_title.setAutomaticallyEraseValue(false);
	autocomp_title.setOnSelectCallback(reactOnSelectTitle);
	title_td.append(title_input);
	expense.append(title_td);
	
	var price_td = $("<td/>");
	var price_input = $("<input/>");
	price_input.addClass("price-input");
	price_input.attr("required", "");
	price_input.attr("size", "10");
	price_input.attr("type", "text");
	price_input.attr("pattern", "[-+]?(\\d{1,3}([\\s,]\\d{3})*|\\d+)(\\.\\d{0,2})?"); // 1000.00, 1 000.00, 1000 are valids
	price_input.attr("placeholder", "0.00");
	price_input.focus(reactOnPriceFocus);
	price_input.focusout(reactOnPriceFocusOut);
	price_input.keyup(reactOnExpenseChange);
	price_td.append(price_input);
	expense.append(price_td);

	var categories_td = $("<td/>");
	categories_td.addClass("categories-data");
	var categories_input = $("<input/>");
	categories_input.addClass("categories-input");
	categories_input.attr("type", "text");
	categories_input.attr("placeholder", "Classify expense");
	var autocomp_categories = XML_TREES_ELTS;
	var autocomp = new AutocompleteItem(categories_input, autocomp_categories);
	autocomp.setOnSelectCallback(reactOnSelectCategory);
	if (autocomp_categories.length == 0) {
		unitializedCategories.push(autocomp);
	}
	categories_td.append(categories_input);
	expense.append(categories_td);

	var actions_td = $("<td/>");
	var delete_img = $("<span/>");
	delete_img.addClass("glyphicon glyphicon-trash");
	delete_img.attr("style", "cursor:pointer;");
	delete_img.attr("title", "Delete this expense");
	delete_img.click(function() {
		$(this).parent().parent().remove();
		if (ADD_EXPENSES_TABLE.children().length == 0) {
			appendExpense();
		}
	});
	actions_td.append(delete_img);
	var send_img = $("<span/>");
	send_img.addClass("glyphicon glyphicon-ok");
	send_img.attr("style", "cursor:pointer;");
	send_img.attr("title", "Save this expense");
	send_img.click(ajaxSaveNewExpense);
	actions_td.append(send_img);
	expense.append(actions_td);

	ADD_EXPENSES_TABLE.append(expense);
}

function getTreeNodePath(node) {
	if (node && node.attr("title")) {
		var parent_path = getTreeNodePath(node.parent());
		if (parent_path.length > 0) {
			return parent_path + " > " + node.attr("title");
		} else {
			return node.attr("title");
		}
	}
	return "";
}

function loadTrees(nodes) {
	for (var i = 0 ; i != nodes.length ; i++) {
		var node = $(nodes[i]);
		var children = node.children();
		if (children.length > 0) {
			loadTrees(children);
		} else {
			var elt = {
					autocomplete_rawdata_on: getTreeNodePath(node),
					autocomplete_rawdata_after: node.attr("title"),
					autocomplete_id: node.attr("id")
			};
			XML_TREES_ELTS.push(elt);
		}
	}
}

function initAddExpensesTable(addExpenseUrl, xmlTreeUrl, autocomplete_for_title) {
	// Initialize expenses table
	
	XML_EXPENSE_ADD_URL = addExpenseUrl;	
	ADD_EXPENSES_TABLE = $('table#add_expenses_table tbody');
	ADD_EXPENSES_TABLE.html("");
	AUTOCOMPLETE_TITLES = autocomplete_for_title;
	appendExpense();
	$("button#submit-expenses").click(ajaxSaveAllExpenses);

	$.ajax({
		type: "get",
		url: xmlTreeUrl,
		dataType: "xml",
		success: function(xml)
		{
			XML_TREES_ELTS = new Array();
			var root_nodes = $(xml).find("trees").first().find("> node");
			loadTrees(root_nodes);
			for (var i = 0 ; i != unitializedCategories.length ; i++) {
				unitializedCategories[i].updateList(XML_TREES_ELTS);
			}
			unitializedCategories = new Array();
		}
	});
}

/**
 * AJAX query to save all expenses
 */
function ajaxSaveAllExpenses()
{
	if (! XML_EXPENSE_ADD_URL)
	{
		alert("Unable to find the url");
		return;
	}
	
	var expenses = ADD_EXPENSES_TABLE.find("tr");
	for (var i = 0 ; i != expenses.length ; i++) {
		var expense = $(expenses[i]);
		var expense_details = isFilledExpense(expense);
		if (expense_details && (expense.hasClass('expense-edit') || expense.hasClass('expense-fail'))) {
			expense.find("span.glyphicon-ok").click();
		}
	}
}

/**
 * AJAX query to save new expense
 */
function ajaxSaveNewExpense()
{
	if (! XML_EXPENSE_ADD_URL)
	{
		alert("Unable to find the url");
		return;
	}

	var expense = $(this).parent().parent();
	if (! expense.hasClass('expense-edit') && ! expense.hasClass('expense-fail'))
	{
		alert("The operation cannot be run on this expense");
		return;
	}
	var expense_details = isFilledExpense(expense);
	if (! expense_details) {
		alert("Please fill the expense before saving it");
		return;
	}

	var categories = "";
	for (var i = 0 ; i != expense_details["categories"].length ; i++) {
		categories += "[" + expense_details["categories"][i] + "]";
	}
	
	expense.removeClass('expense-edit');
	expense.addClass('expense-wait');
	$.ajax({
		type: "post",
		url: XML_EXPENSE_ADD_URL,
		data:
		{
			_xsrf: getCookie("_xsrf"),
			client_id: expense.attr('data-expense-identifier'),
			title: expense_details['title'],
			date: expense_details['date'],
			price: expense_details['price'],
			categories: categories,
		},
		dataType: "xml",
		success: function(xml)
		{
			expense.removeClass('expense-wait');
			expense.addClass('expense-success');
			setTimeout(function() {
				expense.remove();
			}, 3000);
		},
		error: function(xhr)
		{
			expense.removeClass("expense-wait");
			expense.addClass('expense-fail');
			setTimeout(function() {
				expense.removeClass("expense-fail");
				expense.addClass('expense-edit');
			}, 3000);
			alert($(xhr.responseText).text());
		}
	});
}

