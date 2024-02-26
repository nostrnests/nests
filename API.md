Where auth is required, all endpoints use [NIP-98 HTTP Auth](https://github.com/nostr-protocol/nips/blob/master/98.md).

# Create Room

`PUT /api/v1/nests`

**Authorization is required.**

### Request:

```js
{
    "relays": ["wss://relay.snort.social", "wss://relay.damus.io"],
    "hls_stream": true
}
```

`relays` should contain a list of relays which will be used in the room event.
`hls_stream` should indicate if you would like to create a HLS stream output for cross-client compatability with NIP-53 clients (zap.stream/nostrudel.ninja/Amethyst).

### Response:

```js
{
    "roomId: "<guid>",
    "endpoints": [
        "wss+livekit://nostrnests.com",
        "https://nostrnests.com/api/v1/live/<guid>/live.m3u8" // HLS stream endpoint for this room
    ],
    "token": "<JWT-for-livekit>"
}
```

The `roomId` **SHOULD** be used as the `d` tag of the replacable event.

The client **MUST** include `endpoints` in the room event using the `streaming` tag eg:

```js
{
    ...,
    "tags": [
        ["d", "<roomId>"],
        ["streaming", "wss+livekit://nostrnests.com"],
        ["streaming", "https://nostrnests.com/api/v1/live/<roomId>/live.m3u8"]
    ]
}
```

# Join room

`GET /api/v1/nests/<room-id>`

**Authorization is required.**

### Response:

```js
{
    "token": "<JWT-for-livekit>"
}
```

# Join room as Guest

`GET /api/v1/nests/<room-id>/guest`

### Response:

```js
{
    "token": "<JWT-for-livekit>"
}
```

# Update permissions

`POST /api/v1/nests/<room-id>/permissions`

**Authorization is required.**

### Request:

```js
{
    "participant": "<hex-pubkey>", // required, user to change permissions for
    "can_publish": true, // optional (Admin or Self)
    "mute_microphone": true, // optional (Admin)
    "is_admin": true // optional (Host)
}
```

- If the changes are accepted, the response code is `201 Accepted`
- If the reoom is not found the response code is `404 Not Found`
- If the request is invalid in any way the response code is `400 Bad Request`
- If the user is not allowed to make a change to the permissions of `participant` the status code is `401 Unauthorized`
- If no changes are made the status code is `204 No Content`

# Room Info

`GET /api/v1/nests/<room-id>/info`

### Response:

```js
{
    "host": "<hex-pubkey",
    "speakers": ["<hex-pubkey>", ...],
    "admins": ["<hex-pubkey>", ...],
    "link": "<nip-19-code>",
    "recording": true // if room is being recorded
}
```

_Room info will also be included in the metadata of the room provided by LiveKit websocket_

# Start Recording

`POST /api/v1/nests/<room-id>/recording`

**Authorization is required.**

**Only admins of the room may perform this actions.**

If the recording has started the response code is `201 Accepted`

# Stop Recording

`PATCH /api/v1/nests/<room-id>/recording/<recording-id>`

**Authorization is required.**

**Only admins of the room may perform this actions.**

If the recording has stopped the response code is `201 Accepted`

# List Recordings

`GET /api/v1/nests/<room-id>/recording`

**Authorization is required.**

**Only admins of the room may perform this actions.**

### Response:

```js
[
  {
    id: "<recording-id>",
    started: 1708945852,
    stopped: 1708945853, // optional
    url: "https://nostrnests.com/api/v1/nests/recording/<recording-id>",
  },
];
```

# Download Recording

`GET /api/v1/nests/<room-id>/recording/<recording-id>`

**Authorization is required.**

**Only admins of the room may perform this actions.**

### Response:

`binary`

# Delete Recording

`DELETE /api/v1/nests/<room-id>/recording/<recording-id>`

**Authorization is required.**

**Only admins of the room may perform this actions.**

If the file is deleted the response code is `201 Accepted`
