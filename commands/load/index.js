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

/**
 * Handles consumer events.
 * @param {} channel AMPQ channel to send acknowledgement
 * @returns {Function} Callback function for consumer
 */
let messageHandler = (channel) => ((msg) => {
    // Run artificial delay, then send reply, then acknowledge the queue.
    setTimeout(() => {
        console.log(msg.content.toString());
        let data = JSON.parse(msg.content.toString());

        // API Endpoint that adds replies to the interaction.
        axios.post(`/webhooks/${APPLICATION_ID}/${data.token}`, {
            content: `Response from ${HOST}.`
        }).then(() => {
            console.log("Completed job.");
        }).catch((error) => {
            console.error(error);
        });

        channel.ack(msg); // Tell rabbitmq that we have completed this job.
    }, 5000);
});

amqp.connect(`amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@${RABBITMQ_URL}`, (error0, connection) => {
    if(error0)
        throw error0;

    // Channel to communicate with RabbitMQ
    connection.createChannel((error1, channel) => {
        if(error1)
            throw error1;

        const exchange = 'topic_commands'; // Exchange to connect the queue to.
        const queue = 'command_load_queue'; // Name of queue to create.
        const queue_topic = 'command.load'; // Event for the queue to listen to.

        // Creates exchange if doesn't exist, or uses existing.
        channel.assertExchange(exchange, 'topic', {
            durable: false
        });

        // Allow to only consume a single item from the queue at a time. (Emphasizes load.)
        channel.prefetch(1);

        // Creates queue if doesn't exist, or joins the existing queue.
        channel.assertQueue(queue, {
            durable: false
        }, (error2, q) => {
            if(error2)
                throw error2;

            // Bind our queue to the exchange, using the specified topic.
            channel.bindQueue(q.queue, exchange, queue_topic);
            
            // Specifies handler for messages from the queue. noAck: false tells RabbitMQ to wait for our acknowledgement.
            channel.consume(q.queue, messageHandler(channel), {noAck: false});
        });
    });
});