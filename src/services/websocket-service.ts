// *********************************************************
// This file is api for server sided user object 3d tracking
// *********************************************************

// Resources used:
// https://medium.com/factory-mind/websocket-node-js-express-step-by-step-using-typescript-725114ad5fe4
// https://github.com/websockets/ws/
// https://stackoverflow.com/questions/34700438/global-events-in-angular
// https://indepth.dev/posts/1336/how-to-do-dom-manipulation-properly-in-angular

import * as http from 'http';
import { clearInterval } from 'timers';
import WebSocket = require('ws');
import { Cypher } from './cypher';
import { Pov } from './pov';

// Extend WebSocket namespace to include a property, isAlive: boolean, for detection and closure of broken connections
interface CustomWebSocket extends WebSocket {
    isAlive: boolean;
    pov: Pov | undefined;
    // note: we cannot add event listener
}

// Extend class property, clients, to handle <Set> with new CustomWebSocket elements
class CustomServer extends WebSocket.Server {
    clients!: Set<CustomWebSocket>;
}

export class WebSocketService {
    // This is a websocket server service handler and an api for the game connected at the server
    // Initialize class parameters 
    private wss!: CustomServer;
    public worldState: any = {
        users: []
    };
    public intervalID!: NodeJS.Timer;
    public pulseInterval: number = 20; //TODO: test ms ping limit, i like 3ms - 60ms
    private cypher = new Cypher(); // lib of hlpr fxs

    constructor() { }

    public init(server: any) {

        this.wss = new CustomServer({ server });
        this.wss.on('connection', (ws: CustomWebSocket, req: http.IncomingMessage) => {
            // /* HANDSHAKE INITIALIZATION */
            // html > ws upgrade and connection event
            console.log(`[openid]: ${req.headers['sec-websocket-key']}`);
            // create server sided user NOTE: weird implementation rn with the CustomWebsocket.id, but works and decent security
            ws.pov = { id: `${req.headers['sec-websocket-key']}` };
            // it is important to be able to at least pass the id parameter in but we are doing some weird encoding here
            ws.send(this.serializeMessage(JSON.stringify({ userReady: ws.pov })));

            // declare websocket listener callbacks
            // websocket error event
            ws.on('error', (error: Error) => {
                console.error(`[socket error]: ${error.message}`);
            });
            // websocket close event 
            ws.on('close', (code: number, reason: string) => {
                console.log(`[closeid]: ${req.headers['sec-websocket-key']}`); // server logging closed connection id
                // find index of user with closed connection id and splice it
                let userIndex = this.worldState.users.findIndex((user: Pov) => user.id === req.headers['sec-websocket-key'])
                this.worldState.users.splice(userIndex, 1);
                // broadcast to all clients which user left in order for front end engine to update itself
                this.wss.clients.forEach((ws: CustomWebSocket) => {
                    ws.send(this.serializeMessage(JSON.stringify({ userLeft: req.headers['sec-websocket-key'], code: code, reason: reason })));
                });
            })
            // websocket message receive event
            ws.on('message', (data) => {
                this.onMessage(ws, data);
            });
            // socket pong receive event
            ws.on('pong', (data) => {
                this.onHeartbeat(ws, data);
            });
            // ping each client => TODO: implement ws.alive to handle reconnection
            this.intervalID = setInterval(() => {
                this.wss.clients.forEach((ws: CustomWebSocket) => {
                    ws.ping(); //client (browser) internally responds with a 'pong' as per the spec\
                });
            }, this.pulseInterval); //on <180ms short ping updates, it crashed, try to implement a serverreadystatebefore starting ping

        });
        // on websocket server error , log error callback
        this.wss.on('error', (error: Error,) => {
            console.error(`[server error]: ${error.message}`);
        });
        // on websocket server close, stop pinging 
        this.wss.on('close', () => {
            clearInterval(this.intervalID);
        });
        // // redundant(?) header event header call back as string array 
        // this.wss.on('headers', (headers: string[], request: http.IncomingMessage) => {
        //     // console.log(`[headers]: ${headers} | [request]: ${request.readable} `);
        // })
    }

    // update the users array when a valid message is received
    private onMessage(ws: CustomWebSocket, nonFiltered: any) {
        // parse message
        let message = nonFiltered;
        try { // try so the server won't blow up on invalid messages
            message = this.deserializeMessage(message);
            // check ws message for worldstate ping
            if (this.cypher.detectWorldState(message)) { //bool
                message = this.cypher.deserializeWorldState(message);
                let user = JSON.parse(message);
                if (user.hasOwnProperty('id')) { //bool
                    try { // prevent server blow up on invalid messages
                        let userIndex = this.worldState.users.findIndex((element: Pov) => element.id === user.id);
                        if (userIndex === -1) { // If the user sending broadcast is not found via id property, append user json object to users array
                            this.worldState.users.push(user);
                        }
                        else { // overwrite the existing user with the updated user
                            this.worldState.users[userIndex] = user; // Consider: this.worldState.users[userIndex].position = user.position; // this.worldState.users[userIndex].rotation = user.rotation;
                        }
                    }
                    catch (error) {
                        console.log(`message has id but potentially not a valid User type ${error}`);
                    }

                } else {
                    console.log('message has no id');
                }
            }
            // Else if, a websocket broadcast 
            else if (this.cypher.detectBroadcast(message)) {
                message = this.cypher.deserializeBroadcast(message);

                //send back the message to the other clients with an open connection
                this.wss.clients.forEach((client: any) => {
                    if (client != ws && client.readyState === WebSocket.OPEN) {
                        client.send(this.serializeMessage(message));
                    }
                });
            }
            else {
                console.log(`received: ${message}`);
            }

        } catch (error) {
            // Smart WebSocket Client types
            console.log(`foreign message received: ${error}`);
        }
    }

    private deserializeMessage(message: string): string {
        //we use JSON.parse x2 because of the given regex format
        return JSON.parse(JSON.parse(message));
    }

    private serializeMessage(message: string): string {
        // We stringify here to be compatible with rxjs based websocket in angular
        return JSON.stringify(message);
    }

    private onHeartbeat(ws: CustomWebSocket, data: Buffer) {
        ws.isAlive = true;
        // ws.send(this.serializeMessage('lub-dub-lub-dub-lub-dub...'))
        ws.send(this.serializeMessage(this.worldState));
    }
}
