/**
 * Load command handler.
 */

const amqp = require('amqplib/callback_api');

const APPLICATION_ID = process.env.APPLICATION_ID;
const BOT_TOKEN = process.env.BOT_TOKEN;
const RABBITMQ_URL = process.env.RABBITMQ_URL;
const RABBITMQ_USER = process.env.RABBITMQ_USER;
const RABBITMQ_PASS = process.env.RABBITMQ_PASS;
const HOST = process.env.HOSTNAME;

const axios = require('axios').create({baseURL: 'https://discord.com/api/v10/',
    timeout: 5000, headers: {'Authorization':`Bot ${BOT_TOKEN}`}});

let messageHandler = (channel) => ((msg) => {
    // Run artificial delay, then send reply, then acknowledge the queue.
    setTimeout(() => {
        console.log(msg.content.toString());
        let data = JSON.parse(msg.content.toString());

        axios.post(`/webhooks/${APPLICATION_ID}/${data.token}`, {
            content: `Response from ${HOST}.`
        }).then(() => {
            console.log("Completed job.");
        }).catch((error) => {
            console.error(error);
        });

        channel.ack(msg);
    }, 5000);
});

amqp.connect(`amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_URL}`, (error0, connection) => {
    if(error0)
        throw error0;
    
    connection.createChannel((error1, channel) => {
        if(error1)
            throw error1;

        const exchange = 'topic_commands';
        const queue = 'command_load_queue';
        const queue_topic = 'command.load';

        channel.assertExchange(exchange, 'topic', {
            durable: false
        });

        // Allow to only consume a single item from the queue at a time. (Emphasizes load.)
        channel.prefetch(1);

        channel.assertQueue(queue, {
            durable: false
        }, (error2, q) => {
            if(error2)
                throw error2;
            channel.bindQueue(q.queue, exchange, queue_topic);
            
            channel.consume(q.queue, messageHandler(channel), {noAck: false});
        });
    });
});