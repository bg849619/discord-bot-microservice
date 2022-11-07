/**
 * Entrypoint to Discord Webhook Gateway
 * Responsible for responding to pings from Discord, and 
 * routing interactions, etc. to proper RabbitMQ queues.
 */

const {verifyKey, InteractionResponseType, InteractionType} = require('discord-interactions');
const amqp = require('amqplib/callback_api');
const bodyParser = require('body-parser');
const express = require('express');

// It's ususally a good idea to pull certain keys, settings, etc. from environment variables.
// An alternative is to mount these into a directory or file.
const CLIENT_PUB_KEY = process.env.CLIENT_PUB_KEY;
const RABBITMQ_URL = process.env.RABBITMQ_URL;
const RABBITMQ_USER = process.env.RABBITMQ_USER;
const RABBITMQ_PASS = process.env.RABBITMQ_PASS;

const app = express();
// Parse request bodies as raw buffers. This is needed so the verifyKey function can verify the authenticity.
// Of the request.
app.use(bodyParser.raw({type: "*/*"})); 

// Listen to post requests to our server from the Discord servers.
app.post('/api/webhook', (req, res) => {
    // Check key.
    const signature = req.header('X-Signature-Ed25519');
    const timestamp = req.header('X-Signature-Timestamp');
    const isValidRequest = verifyKey(req.body, signature, timestamp, CLIENT_PUB_KEY);
    if(!isValidRequest)
        return res.status(401).send('Invalid request signature');

    // Respond to PING requests with ACK. (Discord periodically sends this to verify our servers are online.)
    req.body = JSON.parse(req.body);
    if (req.body['type'] == InteractionType.PING)
        return res.status(200).send(JSON.stringify({type: InteractionResponseType.PONG}));

    // Handle application commands.
    if (req.body['type'] == InteractionType.APPLICATION_COMMAND){
        // For testing purposes, we have a ping command which does not leave the Gateway.
        if(req.body.data.name == 'ping')
            return res.status(200).send(
                {type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data:{
                    content: "Pong!"
                }});

        // The load command is different. It simulates a compute-heavy command, and sends multiple, so we can see the improvement from concurrency.
        // Create multiple copies of the command in its queue.
        if(req.body.data.name == 'load'){
            let count = 0;
            for(let i = 0; i < req.body.data.options.length; i++){
                if(req.body.data.options[i].name == "count")
                    count = req.body.data.options[i].value;
            }

            // Before dispatching to workers, respond with message. (There has to be an initial response before the workers can send additional replies)
            res.status(200).send({type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE, data:{content: "Workers responding soon."}});

            // Dispatch certain number of commands.
            for(let i = 0; i < count; i++){
                router.routeCommand("command.load", JSON.stringify(req.body));
            }

            return // Nothing else is needed. Return.
        }

        // If we've made it this far, there's nothing special about the command, so respond with a Deferral. 
        res.status(200).send({type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE});

        // Add the command body to the RabbitMQ queue.
        return router.routeCommand(`command.${req.body.data.name}`, JSON.stringify(req.body));
    }

    // We don't handle anything else right now.
    else 
        return res.status(400).send('Bad request.');
});

// Good way to test if the webserver is actually listening.
app.get('/', (_, res) => {
    return res.status(200).send("Hello world.");
});

// Object to store message routing-related functions.
let router = {};

// RabbitMQ setup.
amqp.connect(`amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_URL}`, (error0, connection) => {
    if(error0)
        throw error0;
    
    // Creates a channel for the program to talk to the RabbitMQ cluster.
    connection.createChannel((error1, channel) => {
        if(error1)
            throw error1;

        // Name of exchange which messages are sent through.
        const exchange = 'topic_commands';
        
        // Creates exchange if it doesn't exist, otherwise uses it.
        channel.assertExchange(exchange, 'topic', {
            durable: false
        });

        /**
         * Routes command data through RabbitMQ cluster.
         * @param {String} descriptor Topic description, e.g. command.ping
         * @param {String} data Data to send in message.
         */
        router.routeCommand = (descriptor, data) => {
            // Publish the message into the exchange, so it can be routed to the approriate queue.
            channel.publish(exchange, descriptor, Buffer.from(data));
            console.log(`Routed command ${descriptor}`);
        }

        // Start express app after channel has been opened.
        app.listen(process.env.PORT, (err) => {
            if (err){
                console.error(err);
                process.exit(1);
            }
            console.log('Listening');
        });
    });
});
