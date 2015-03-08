function WebSocketManager(url)
{
	var self = this;
	
	self._last_id = 0;
	self._url = url;
	self._ws = undefined;
	self._ping = undefined;
	self._waiting_list = new Array();
	self._message_readers = new Array();
	self._waiting_callbacks = {};
	
	/* Internal methods to open and close websockets */
	
	self.open = function()
	{
		if (self._ws !== undefined)
		{
			console.warning("An existing WebSocket already exists, it has been closed");
			self.close();
		}
		var ws = new WebSocket(self._url);
		ws.onopen = self.onopen;
		ws.onmessage = self.onmessage;
		ws.onerror = self.onerror;
		ws.onclose = self.onclose;
		self._ws = ws;
		self._ping = setInterval(self.ping, 30000);
	};

	self.close = function()
	{
		if (self._ws !== undefined)
		{
			self._ws.close();
			self._ws = undefined;
		}
	};
	
	self.isReady = function()
	{
		if (self._ws === undefined)
		{
			return false;
		}
		return self._ws.readyState == 1;
	};

	self.ping = function()
	{
		// Used to keep the session alive
		// By default, nginx considers that the session is not alive if it does not receive
		// any messages during 60 seconds
		if (self._ws === undefined)
		{
			clearInterval(self._ping);
		}
		if (self.isReady())
		{
			self.send("ping", undefined, undefined);
		}
	};
	
	/* Internal callbacks called by the internal websocket */

	self.onopen = function()
	{
		while (self._waiting_list.length > 0)
		{
			self.send(self._waiting_list[0]["aim"], self._waiting_list[0]["message"]);
			self._waiting_list.splice(0, 1);
		}
		console.log("WebSocketManager:: WebSocket has been opened succesfully");
	};

	self.onmessage = function(event)
	{
		var data = JSON.parse(event.data);
		console.log("WebSocketManager:: Received: " + data);
		
		if (data["aim"] == "response")
		{
			var msg = data["message"];
			var s = data["status"];
			var id = parseInt(data["id"]);
			
			if (self._waiting_callbacks[id] === undefined)
			{
				console.warn("WebSocketManager:: Unknown callback for " + data);
				return;
			}
			
			var fully_treated = self._waiting_callbacks[id](s, msg);
			if (s == "error" && !fully_treated)
			{
				var $modal = $("#myModal");
				$modal.find(".modal-title").text("Error");
				$modal.find(".modal-body").text(msg);
				var $btn = $modal.find(".btn-primary");
				$btn.hide();
				$modal.modal();
			}
			return;
		}
		for (var i = 0 ; i != self._message_readers.length ; i++)
		{
			self._message_readers[i](data);
		}
	};
	
	self.onerror = function(event)
	{
		console.warn("WebSocketManager:: WebSocket has failed with " + event);
        
		var reason = "";
		if (event.code == 1000)
		{
			reason = "Normal closure, meaning that the purpose for which the connection was established has been fulfilled.";
		}
		else if (event.code == 1001)
		{
			reason = "An endpoint is \"going away\", such as a server going down or a browser having navigated away from a page.";
		}
		else if (event.code == 1002)
		{
			reason = "An endpoint is terminating the connection due to a protocol error";
		}
		else if (event.code == 1003)
		{
			reason = "An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).";
		}
		else if (event.code == 1004)
		{
			reason = "Reserved. The specific meaning might be defined in the future.";
		}
		else if (event.code == 1005)
		{
			reason = "No status code was actually present.";
		}
		else if (event.code == 1006)
		{
			reason = "The connection was closed abnormally, e.g., without sending or receiving a Close control frame";
		}
		else if (event.code == 1007)
		{
			reason = "An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [http://tools.ietf.org/html/rfc3629] data within a text message).";
		}
		else if (event.code == 1008)
		{
			reason = "An endpoint is terminating the connection because it has received a message that \"violates its policy\". This reason is given either if there is no other sutible reason, or if there is a need to hide specific details about the policy.";
		}
		else if (event.code == 1009)
		{
			reason = "An endpoint is terminating the connection because it has received a message that is too big for it to process.";
		}
		else if (event.code == 1010) // Note that this status code is not used by the server, because it can fail the WebSocket handshake instead.
		{
			reason = "An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake. <br /> Specifically, the extensions that are needed are: " + event.reason;
		}
		else if (event.code == 1011)
		{
			reason = "A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.";
		}
		else if (event.code == 1015)
		{
			reason = "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).";
		}
		else
		{
			reason = "Unknown reason";
		}
		
		console.log("WebSocketManager:: Reason: " + reason);
	};

	self.onclose = function() {
		console.warn("WebSocketManager:: WebSocket has been closed...");
		self._ws = undefined;
        
		var $modal = $("#myModal");
		$modal.find(".modal-title").text("Lost connection");
		$modal.find(".modal-body").text("You have been disconnected from websockets. Please refresh the webpage or press reconnect if you want to stay connected to automatic updates.");
		var $btn = $modal.find(".btn-primary");
		$btn.text("Reconnect");
		$btn.click(self.open);
		$btn.show();
		$modal.modal();
	};

	/* External API */
	
	self.send = function(aim, message, callback) {
		var data = {
				aim: aim,
				message: message,
		};

		if (! self.isReady()) {
			self._waiting_list.push(data);
			return;
		}
		
		data["id"] = -1;
		if (callback)
		{
			data["id"] = self._last_id++;
			self._waiting_callbacks[data["id"]] = callback;
		}
		console.log("WebSocketManager:: send(" + aim + ", " + data["id"] + ")");
		self._ws.send(JSON.stringify(data));
	};

	self.addReader = function(reader)
	{
		// reader will be called fo each message
		// with data argument (json)
		self._message_readers.push(reader);
	};

	{
		self.open();
	}
}

