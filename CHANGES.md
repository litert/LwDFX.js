# Changes

## v1.1.1

- fix(project): use native `Error` as the based class for exceptions.

## v1.1.0

- feat(protocol): added unix socket supports.
- feat(protocol): accepts socket factory function to produce sockets.
- feat(connection): added ended/finished properties and finished event.
- feat(connection): added timeout property and timeout event.
- feat(encoder): accepts string as data to send.
- feat(connector): added `IConnection.writable` property.

## v1.0.4

- fix(gateway): make socket no delay.

## v1.0.3

- fix(protocol): prepended data frame header with magic.

## v1.0.2

- feat(encoder): allow send multiple chunks as one frame.
