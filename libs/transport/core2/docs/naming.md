## Naming

It's important to name the things correctly before we move on.

- **Command** - Always in imperative form. Shouldn't return data back, but can return unique message id

- **Query** - Request to query data. Always returns data back

- **Event** - Always in past form. Usually it's a result of the Command. One Command can create multiple Events as well. Not awaitable.

- **Message** - All of the above (Commands, Queries, Events) are called messages
