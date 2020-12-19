# Microservices Prototype

Event-driven architecture

## Naming

- `Command` (RPC) - Always in imperative form. Shouldn't return data back, but can return unique message id.
- `Query` (RPC) - Request to query data. Always returns data back
- `Event` - Always in past. Usually it's a result of the Command. One Command can create multiple Events as well. Not awaitable.

- `Action` - Client sent message to via Pusher

- `Message` - All of them are called messages
