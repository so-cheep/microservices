# Microservices Prototype

Event-driven architecture

## Naming

- `Command` (RPC) - Always in imperative form. Shouldn't return data back, but can return unique message id.
- `Query` (RPC) - Request to query data. Always returns data back
- `Event` - Always in past. Usually it's a result of the Command. One Command can create multiple Events as well. Not awaitable.

- `Message` - All of them are called messages

## Transports

- `MemoryTransport` - `Ready` In-memory rxjs implementation
- `RabbitMQTransport` -
- `SnsSqsTransport` -
- `SocketIoServerTransport` -
- `SocketIoClientTransport` -
- `WebSocketTransport` -
