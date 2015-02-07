var ADD_EXPENSES_TABLE = null;
var LAST_EXPENSE_ID = 0;

function appendExpense() {
	var expense = $("<tr/>");
	expense.attr("data-expense-identifier", LAST_EXPENSE_ID);
	
	var date_li = $("<td/>");
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
	date_li.append(date_input_desc);
	date_li.append(date_input);
	expense.append(date_li);

	var title_li = $("<td/>");
	var title_input = $("<input/>");
	title_input.addClass("title-input");
	title_input.attr("required", "");
	title_input.attr("size", "50");
	title_input.attr("type", "text");
	title_input.attr("placeholder", "Short description of the expense");
	title_li.append(title_input);
	expense.append(title_li);
	
	var price_li = $("<td/>");
	var price_input = $("<input/>");
	price_input.addClass("price-input");
	price_input.attr("required", "");
	price_input.attr("size", "10");
	price_input.attr("type", "text");
	price_input.attr("pattern", "[-+]?\\d+(\\.\\d?\\d?)?");
	price_input.attr("placeholder", "0.00");
	price_li.append(price_input);
	expense.append(price_li);

	var categories_li = $("<td/>");
	expense.append(categories_li);

	var actions_li = $("<td/>");
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
	actions_li.append(delete_img);
	var send_img = $("<span/>");
	send_img.addClass("glyphicon glyphicon-ok");
	send_img.attr("style", "cursor:pointer;");
	send_img.attr("title", "Save this expense");
	actions_li.append(send_img);
	expense.append(actions_li);

	ADD_EXPENSES_TABLE.append(expense);
	LAST_EXPENSE_ID++;
}

function initAddExpensesTable() {
	ADD_EXPENSES_TABLE = $('table#add_expenses_table tbody');
	ADD_EXPENSES_TABLE.html("");
	appendExpense();
}
