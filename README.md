# Discord Bot Microservice Example

This is a basic discord bot which serves as an example of a microservice architecture. The program is split into a "gateway", along with each individual command being a separate application. A message broker, in this case RabbitMQ, serves as the method of communication between the services. RabbitMQ can take messages from a producer, throw them into a queue, from which consumers will take the next available data when ready.

## Components

### Gateway

Serves as an entrypoint from the Discord servers. This is responsible for taking HTTP requests from Discord, establishing a trust with those servers, and routing requsts to the appropriate service to handle.

### Command Handlers

Each command available to the bot runs as its own executable. The handlers will listen to a specific RabbitMQ queue for commands (which were routed from the gateway). Once a command is received, the handlers do the processing, then use an HTTP callback to Discord's servers to give a result.

It's possible to scale these handlers as demand increases. In this example, some intentional, unnecessary workload is added to simulate a heavy user load. Since the work is delayed, the queue starts to fill. As the queue fills, we can tell Kubernetes to scale up the running pods for the command handler.

## Using

This microservice expects a RabbitMQ message broker for communication from the gateway to the command handlers. This doesn't necessarily have to run on Kubernetes, but this application was designed with Kubernetes in mind.

Each command handler, and the gateway are built as docker images. These images then require information to connect to the RabbitMQ cluster. The gateway also needs information to authenticate to the Discord servers.