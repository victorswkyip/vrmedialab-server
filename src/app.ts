import express from 'express';
import * as http from 'http';
import 'dotenv/config';
import { WebSocketService } from './services/websocket-service';
import * as path from 'path';

// define an express application
const app = express();
 
// serve express application directory 
const server = http.createServer(app); //TODO: Test on https not http, refer to: https://github.com/websockets/ws/issues/1812#issuecomment-716100901

// define the port from environment file
const port = process.env.PORT;

// create an instance of the websocket service server
const wss = new WebSocketService().init(server);

//start listening to server stream
server.listen(port, () => {
    console.log(`listening on *:${port}`);
}); 
 