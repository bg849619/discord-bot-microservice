/**
 * Entrypoint to Discord Webhook Gateway
 * Responsible for responding to pings from Discord, and 
 * routing interactions, etc. to proper RabbitMQ queues.
 */

const {verifyKey, InteractionResponseType, InteractionType} = require('discord-interactions');
const amqp = require('amqplib/callback_api');
const bodyParser = require('body-parser');
const express = require('express');

const CLIENT_PUB_KEY = process.env.CLIENT_PUB_KEY;
const RABBITMQ_URL = process.env.RABBITMQ_URL;
const RABBITMQ_USER = process.env.RABBITMQ_USER;
const RABBITMQ_PASS = process.env.RABBITMQ_PASS;

const app = express();
app.use(bodyParser.raw({type: "*/*"})); // For now, use raw body data, so that verifyKey can interpret it.

app.post('/api/webhook', (req, res) => {
    // Check key.
    const signature = req.header('X-Signature-Ed25519');
    const timestamp = req.header('X-Signature-Timestamp');
    const isValidRequest = verifyKey(req.body, signature, timestamp, CLIENT_PUB_KEY);
    if(!isValidRequest)
        return res.status(401).send('Invalid request signature');

    // Respond to PING requests with ACK.
    req.body = JSON.parse(req.body);
    if (req.body['type'] == InteractionType.PING)
        return res.status(200).send(JSON.stringify({type: InteractionResponseType.PONG}));

    // Handle application commands.
    if (req.body['type'] == InteractionType.APPLICATION_COMMAND){
        // For testing purposes, immediately respond to ping.
        if(req.body.data.name == 'ping')
            return res.status(200).send(
                {type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data:{
                    content: "Pong!"
                }});

        // For testing purposes, add the "load" command a bunch of times to the queue.
        if(req.body.data.name == 'load'){
            let count = 0;
            for(let i = 0; i < req.body.data.options.length; i++){
                if(req.body.data.options[i].name == "count")
                    count = req.body.data.options[i].value;
            }

            // Before dispatching to workers, respond with deferral message.
            res.status(200).send(JSON.stringify({type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE}));

            // Dispatch certain number of commands.
            for(let i = 0; i < count; i++){
                router.routeCommand("command.load", JSON.stringify(req.body));
            }

            return // Don't continue with other logic.
        }

        // Defer response so command handler can respond.
        res.status(200).send(JSON.stringify({type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE}));

        // Add the command body to the RabbitMQ queue.
        return router.routeCommand(`command.${req.body.data.name}`, JSON.stringify(req.body));
    }

    // We don't handle anything else right now.
    else 
        return res.status(400).send('Bad request.');
});

app.get('/', (req, res) => {
    return res.status(200).send("Hello world.");
});

let router = {};

// RabbitMQ setup.
amqp.connect(`amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_URL}`, (error0, connection) => {
    if(error0)
        throw error0;
    
    connection.createChannel((error1, channel) => {
        if(error1)
            throw error1;

        const exchange = 'topic_commands';
        
        channel.assertExchange(exchange, 'topic', {
            durable: false
        });

        /**
         * Routes command data through RabbitMQ cluster.
         * @param {String} descriptor Topic description, e.g. command.ping
         * @param {String} data Data to send in message.
         */
        router.routeCommand = (descriptor, data) => {
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
})
