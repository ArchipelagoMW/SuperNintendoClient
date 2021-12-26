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

## Create a directory for your game in the `games` folder
It must be named the same as your game's key from the `games.json` file.

## Create `Game Name.js`
A game file which contains a class called `GameInstance`, which is used to provide functions which enable the client to
interface with your game. It must be named the same as your game's key from the `games.json` file. This file will be
loaded and used by SNC. You will find a template game file in the `games/Example Game` directory named `GameInstance.template.js`.

## Create `romData.js`
This file must be named exactly `romData.js`. It should contain data about memory addresses in your ROM. This file
is loaded by the client, but its contents are not used by the client directly. Instead, it allows you to add data
to the global scope, which can then be referenced in your game file. The recommended pattern is to define exactly
one const called `romData`, and reference that in your GameFile.
```js
const romData = {
  WRAM_START: 0x1234,
  ...
};
```

### Global inheritance
Your files will be loaded into the global scope of the client, and will therefore inherit the client's global
variables. The following are some global variables created by the client which may be of use to you:

#### `serverSocket`
This global contains the `WebSocket` used to communicate with the Archipelago server. You should always check that
the socket exists and is open before attempting to communicate with it:
```js
if (serverSocket && serverSocket.readyState === WebSocket.OPEN) {
  // Socket is able to communicate
}
```

#### `apItemsById`
An object whose keys are AP itemIds, and whose values are item names.
```js
{
  2: 'Tempered Sword',
  ...
}
```

#### `apItemsByName`
An object whose keys are item names, and whose values are AP itemIds.
```js
{
  Bow: 66131,
  ...
}
```

#### `apLocationsById`
An object whose keys are AP locationIds, and whose values are location names.
```js
{
  257: 'Coneria1',
  ...
}
```

#### `apLocationsByName`
An object whose keys are location names, and whose values are AP locationIds.
```js
{
  Mushroom: 1572883,
  ...
}
```

#### `playerSlot`
An integer representing the local player's slot number.

#### `playerTeam`
An integer representing the local player's team number.

#### `players`
An array of objects, each representing a player.
```js
[
  {
    alias: "cool-name",
    class: "NetworkPlayer",
    name: "farrak",
    slot: 1,
    team: 0
  },
  ...
]
```

## Add an icon file
Place your icon file, which must be in `.ico` format, in your game directory.

## You're done!
Submit a pull request and ping `Farrak Kilhn#0418` on Discord. If you don't ping me, you might be waiting a while.
