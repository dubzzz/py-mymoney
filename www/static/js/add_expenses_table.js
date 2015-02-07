var XML_EXPENSE_ADD_URL = null;
var ADD_EXPENSES_TABLE = null;
var LAST_EXPENSE_ID = 0;

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
	return {date: expense_date, title: expense_title, price: expense_price};
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
	price_input.keyup(reactOnExpenseChange);
	price_input.focus(reactOnPriceFocus);
	price_input.focusout(reactOnPriceFocusOut);
	price_td.append(price_input);
	expense.append(price_td);

	var categories_td = $("<td/>");
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

function initAddExpensesTable(addExpenseUrl) {
	// Initialize expenses table
	
	XML_EXPENSE_ADD_URL = addExpenseUrl;	
	ADD_EXPENSES_TABLE = $('table#add_expenses_table tbody');
	ADD_EXPENSES_TABLE.html("");
	appendExpense();
	$("button#submit-expenses").click(ajaxSaveAllExpenses);
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
		},
		dataType: "xml",
		success: function(xml)
		{
			expense.removeClass('expense-wait');
			expense.addClass('expense-success');
		},
		error: function(xhr)
		{
			expense.removeClass("expense-wait");
			expense.addClass('expense-fail');
			alert($(xhr.responseText).text());
		}
	});
}

