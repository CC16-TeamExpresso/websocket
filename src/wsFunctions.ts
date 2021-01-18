import { CustomWebSocket } from './utilities';
import Message from './models/messages';
import Post from './models/post';
import { v4 as uuid } from 'uuid';

export let clients: CustomWebSocket[] = [];

export function setClients(newClients: CustomWebSocket[]) {
	clients = newClients;
}

export async function broadcastMessage(message: any, ws: CustomWebSocket) {
	const newMessage = new Message({
		email: ws.connectionID,
		message: message.message,
		postId: message.postId,
		date: Date.now(),
	});

	try {
		const result = await newMessage.save();
		await Post.updateOne(
			{ _id: message.postId },
			{
				$push: {
					messages: result._id,
				},
			}
		);
	} catch (error) {
		console.log(error);
	}

	for (let i = 0; i < clients.length; i++) {
		//comments or messages should be seen by all connected clients as soon as the the msg is sent (we can start broadcast here because we have all the connected clients)
		const client = clients[i];
		client.send(
			JSON.stringify({
				message: message.message,
				user: ws.connectionID,
				postId: message.postId,
				intent: 'chat',
			})
		);
	}
	//server.listen(1338);
	//ws.send(JSON.stringify({ ...message, user: 'self', intent: 'chat' })); //messges from self for now
	console.log(message, 'is the message');
}

export async function retrieveAndSendMessages(ws: CustomWebSocket, count: number, postId: String) {
	const messages = await Message.find({ postId: postId }).sort({ date: -1 }).limit(count).lean(); //get js based array
	ws.send(
		JSON.stringify({
			postId: postId,
			intent: 'old-messges',
			data: messages,
		}) // this if the recevied websocket request from client has ,old messages, intent the respond is all the messages in the db ordered based on date
	);
}
