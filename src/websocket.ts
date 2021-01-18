require('dotenv').config();
import WebSocket from 'ws';
import { CustomWebSocket, processMessage } from './utilities';
import { broadcastMessage, clients, setClients, retrieveAndSendMessages } from './wsFunctions';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
const server = http.createServer();
const wss = new WebSocket.Server({ noServer: true });

const PORT = process.env.PORT || 1338;

mongoose.connect('mongodb+srv://expresso:expresso@cluster0.ire4b.mongodb.net/peekify');

// for local test
// mongoose.connect('mongodb://localhost:27017/peekify');

wss.on('connection', function connection(ws: CustomWebSocket) {
	//look at utilities
	//create connection ID
	clients.push(ws); //whenever its connected push it to the clients array
	ws.on('close', () => {
		//when connection is closed for whatever reason (user not prohibited to comment)the user is removed from clients
		setClients(clients.filter((generalSocket) => ws.connectionID !== ws.connectionID));
	});
	ws.on('message', function incoming(payload) {
		const message = processMessage(payload.toString());
		if (!message) {
			//broken msg
			return;
		}

		if (message.intent === 'chat') {
			broadcastMessage(message, ws);
		} else if (message.intent === 'old-messages') {
			const count = message.count;
			const postId = message.postId;
			if (!count || !postId) return;
			else retrieveAndSendMessages(ws, count, postId);
		}
	});
});

//reference from authentication : https://github.com/websockets/ws
server.on('upgrade', function upgrade(request, socket, head) {
	//the token is sent on a path from request
	const token = request.url.slice(1); //remove the backslash from the token url that we got from request
	//console.log('REQUEST', request); // this will show you the request which is a very huge file but it has a url part so we used that.
	let email: string = '';
	try {
		const payload: any = jwt.verify(token, process.env.JWT_SECRET_TOKEN);

		email = payload.username; //verfity if token is correctly signed // change the type of any ?
	} catch (error) {
		//dont connect ws server
		socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
		socket.destroy();
		return;
	}
	wss.handleUpgrade(request, socket, head, function done(ws) {
		const _ws = ws as CustomWebSocket;
		_ws.connectionID = email;
		wss.emit('connection', ws, request);
	});
});

server.listen(PORT, () => {
	console.log(`WebSocket server has started on the port: ${PORT}`);
});
