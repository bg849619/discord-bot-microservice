/**
 * Entrypoint to Discord Webhook Gateway
 * Responsible for responding to pings from Discord, and 
 * routing interactions, etc. to proper RabbitMQ queues.
 */

const {verifyKey, InteractionResponseType, InteractionType} = require('discord-interactions');
const express = require('express');
const bodyParser = require('body-parser');
const CLIENT_PUB_KEY = process.env.CLIENT_PUB_KEY;

const app = express();
app.use(bodyParser.raw({type: "*/*"}));

// Map of command names to their RabbitMQ queue.
const commandQueues = {
    'command1':'command1',
    'command2':'command2'
}

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

        if(!commandQueues[req.body.data.name])
            return res.status(400).send('Command does not exist.');
        
        // Add the command body to the RabbitMQ queue.

        // Defer response so command handler can respond.
        return res.status(200).send(JSON.stringify({type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE}));
    }

    // We don't handle anything else right now.
    else 
        return res.status(400).send('Bad request.');
});

app.get('/', (req, res) => {
    return res.status(200).send("Hello world.");
});

app.listen(process.env.PORT, (err) => {
    if (err){
        console.error(err);
        process.exit(1);
    }
    console.log('Listening');
});

