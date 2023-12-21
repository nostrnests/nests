## Room

Following NIP-53 using `kind: 30312`

`service` tag is added to point clients to the API which controls the room

```json
{
  "kind": 30312,
  "tags": [
    ["d", "<unique identifier>"],
    ["title", "<name of the event>"],
    ["summary", "<description>"],
    ["image", "<preview image url>"],
    ["t", "hashtag"],
    ["streaming", "<url>"],
    ["recording", "<url>"], // used to place the edited video once the activity is over
    ["starts", "<unix timestamp in seconds>"],
    ["ends", "<unix timestamp in seconds>"],
    ["status", "<planned, live, ended>"],
    ["current_participants", "<number>"],
    ["total_participants", "<number>"],
    ["p", "aaaa", "wss://provider1.com/", "host"],
    ["p", "bbbb", "wss://provider2.com/nostr", "speaker"],
    ["p", "cccc", "wss://provider3.com/nostr", "speaker"],
    ["p", "dddd", "wss://provider4.com/nostr", "speaker"],
    ["relays", "wss://one.com", "wss://two.com", ...],
    ["service", "https://nostrnests.com/api/v1/nests"],
  ],
  "content": "",
  ...
}
```

## Room Chat

Sames as NIP-53 `kind: 1311`, there is no reason to have another kind here as they always have `a` tag.

```json
{
  "kind": 1311,
  "tags": [
    ["a", "30311:<Community event author pubkey>:<d-identifier of the community>", "<Optional relay url>", "root"],
  ],
  "content": "Zaps to live streams is beautiful.",
  ...
}
```

## Room Presence

New `kind: 10312` provides an event which signals presence of a listener. 
An `expiration` tag SHOULD be used to allow the natural cleanup of these events.

**This kind `10312` is a regular replaceable event, as such presence can only be indicated in one room at a time.**

```json
{
  "kind": 10312,
  "tags": [
    ["a" , "<room-a-tag>", "<relay-hint>", "root"],
    ["expiration", "<unix-timestamp>"]
  ]
}
```

## ZapSplits

Zap splits should be set on the room `kind: 30312` as NIP-57.G `zap` tags