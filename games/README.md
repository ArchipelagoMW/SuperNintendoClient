# Adding a Game to SNC (Super Nintendo Client)

## Add your game to `games.json`
The key of your JSON object should be the friendly name of your game. It will require three values:
- `extensions`: An array containing the supported extensions of your game
- `md5Hash`: The md5Hash of the base ROM of your game
- `shortName`: A string containing only letters and numbers which is representative of your game. This will be used
  to build registry entries

```json
{
  "A Link to the Past": {
    "extensions": [".apbp", ".apz3"],
    "md5Hash": "03a63945398191337e896e5771f77173",
    "shortName": "zelda3"
  }
}
```

## Create `romData.js`
This file must be named exactly `romData.js`. It should contain data about memory addresses in your ROM. This file
is loaded by the client, but its contents are not used by the client directly. Instead, it allows you to add data
to the global scope, which can then be referenced in your GameFile. The recommended pattern is to define exactly
one const called `romData`, and reference that in your GameFile.
```js
const romData = {
  WRAM_START: 0x1234,
  ...
};
```

## Create `Game Name.js`
A game file which contains a class called `GameInstance`, which is used to provide functions which enable the client to
interface with your game. It must be named the same as your game's key from the `games.json` file. This file will be
loaded and used by SNC. 

### Global inheritance
As this file is loaded into the global scope of the client, it inherits all the client's global variables. The
following globals will likely be of use to you:

#### `serverSocket`
This global contains the `WebSocket` used to communicate with the Archipelago server. You should always check that
the socket exists and is open before attempting to communicate with it:
```js
if (serverSocket && serverSocket.readyState === WebSocket.OPEN) {
  // Socket is able to communicate
}
```

### Required Methods

```js
class GameInstance {
  authenticate() {}
}
```

# TODO: MORE DOCS COMING SOON
