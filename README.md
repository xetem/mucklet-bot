# C1-P1: Cinnabar Prism Apartments Management Bot @ Wolfery

The C1-P1 bot (colloquially known as 'Chippy') is designed to assist the Cinnabar Prism apartment complex on the Wolfery.com Mucklet server in serving character in onboarding a personal space in the complex.

This repo is intended to keep progress and revisions saved on the bot, as well as document changes made to the original bot framework so that other bot implementors can share code. ~~This code is not intended to be run as-is, except by the owner @xetem.~~ This bot is being built to be as drop-in compatible with areas of similar usages to C1-P1 in the Cinnabar Prism Apartments in Wolfery as possible.

## Docker

This bot has been set up for use in a docker container, in addition to a stand-alone node app. You can pull the latest image from dockerhub at the tag `xetem/c1-p1:latest`

### `docker run`

Multiple environment variables are set up in the docker image to pass through to the bot.

| Variable | Default (Mucklet.com setting) | Wolfery.com setting | Description |
| --- | --- | --- | --- |
| `API_HOST_URL` | `wss://test.mucklet.com` | `wss://api.wolfery.com` | The host url for the api. |
| `API_WEB_RESOURCE_PATH` | `https://test.mucklet.com/api/` | `https://api.wolfery.com/api/` | The resource url for the api. |
| `API_ORIGIN` | `https://mucklet.com` | `https://wolfery.com` | The host url of the site. |
| `LOGIN_TOKEN` \*Required | Mucklet.com bot token | Wolfery.com bot token | The bot token of the bot accuired from the respective realm. |
| `PERSONALITY_TYPE_SPEED` | `8000` | default | The number of characters per millisecond the bot types messages at. |
| `PERSONALITY_READ_SPEED` | `50000` | default | The number of characters per millisecond the bot reads messages at. |
| `ACTION_WAKEUP_PROBABILITY` | `50` | default | The probablility of the bot waking up a character. |
| `REACTION_ARRIVE_WELCOME_POPULATION_CHANCE` | `{1:1,}` | default | A JS object defining the probabilities of sending a welcome message based on the number of people in a room. |
| `REACTION_ARRIVE_WELCOME_PRIORITY` | `150` | default | The action priority of the bot queueing a welcome message. |
| `REACTION_ARRIVE_WELCOME_DELAY` | `1000` | default | The delay between sending welcome messages. |
| `REACTION_ARRIVE_WELCOME_PHRASES` | `` `["turns to {name}, \"Welcome.\". ((To get help, address me and say \"Help\".))",]` `` | default | An array of possible welcome messages to send. |
| `REACTION_WHISPER_REPLY_CHANCE` | `1` | default | The probability to send a reply to a whisper. |
| `REACTION_WHISPER_REPLY_PRIORITY` | `100` | default | The action priority of the bot queueing a reply to a whisper. |
| `REACTION_WHISPER_REPLY_DELAY` | `1000` | default | The delay between sending replies to whispers. |
| `REACTION_WHISPER_REPLY_PHRASES` | `` `[":does not understand whispers. ((To get help, address me and say \"Help\".))",]` `` | default | An array of possible replies to whispers. |
| `REACTION_APARTMENT_REQUEST_DEST` \*Required | In-realm destination | In-realm destination | The in-realm destination to teleport to and build from, this can currently only be in the form of a room ID, without the leading `#`. |
| `REACTION_APARTMENT_REQUEST_DESC` | ``"An empty apartment. You can change the description here with the pencil in the upper left corner of this sidebar. You can create new rooms off of this room by clicking the pencil next to the `Exit` label below."`` | default | The default text to describe new rooms. |
| `REACTION_APARTMENT_REQUEST_ISBUILDER` | `false` | default | Set to `true` if bot is part of a builder account, changing the transfer of ownership for new rooms and areas from a request to an instant change. |
| `REACTION_APARTMENT_REQUEST_PATH` | `` \`go out\` `` | default | The path of commands to get from the bot's home (where it takes requests) to the point where the user can `go {passphase}`. |

# Mucklet Bot

## Introduction

Mucklet is the game engine running Wolfery.com. This Node.js project provides a
modular bot for accessing a mucklet API.

## Prerequisites

* Install [Node.js](https://nodejs.org/) v14 or greater

## Quick start

Run the following commands. Replace `<BOT_TOKEN>` with a bot token generated
under _Character Settings_ in the client:

 ```text
git clone https://github.com/anisus/mucklet-bot.git
cd mucklet-bot
npm install
node index.js --login.token=<BOT_TOKEN> cfg/config.mucklet.js
```

Login at [Mucklet.com](https://mucklet.com) to see the bot in action.

## Usage
```
node index.js [module options] [config file]
```

### Module options

Module options/params can be set by command. Each module option follow the pattern:
```
--<moduleName>.<optionName>=<value>
```

Example:
```
--personality.typeSpeed=500
```

To disable a module, set option `active` to `false`:
```
--<moduleName>.active=false
```

For details on the options of each module, see: [Modules documentation](docs/modules.md)

### Config file

The config file contains configuration for the modules, and may either be a .js or .json file.

See [cfg/config.mucklet.js](cfg/config.mucklet.js) as a reference.

---

## Code structure

### index.js

The entry point is `index.js`. It parses command flags, loads config, and loads the modules.  
> No bot logic should be put in this file.

### utils/
The `utils/` folder contains common helper functions used by modules and `index.js`.

### modules/

This is where the bot logic is found. See the [Modules section](#modules) below for more info.

## Modules

To learn about a specific module, see: [Modules documentation](docs/modules.md)

Quick notes about modules:
* The bot uses [modapp](https://github.com/jirenius/modapp) modules
* A _module_ is a javascript class implementing modapp's [AppModule interface](https://github.com/jirenius/modapp#appmodule-interface)
* A single instance is created of each module on start
* Each module has a unique name (camelCase). Eg. `actionSay`
* Each module has its own folder, and a .js file with its PascalCased name. Eg.:
  ```text
  modules/charPing/CharPing.js
  ```
* Nested folder structure within `modules/` has no meaning except to help group similar modules


### Example module
To create a new module, you can just copy and rename another module. Or create a new file. E.g.:

`modules/myTest/MyTest.js`
```javascript
class MyTest {
	constructor(app, params) {
		// The modapp App instance
		this.app = app;
		// Other modules required
		this.app.require([ 'api' ], this._init);
	}

	// _init is called by app.require with { api: [api module] }
	_init = (module) => {
		// Get the API version from the server and log it to console
		module.api.get('core.info')
			.then(result => console.log("Version: ", result.version));
	}

	dispose() {} // Nothing to dispose
}

export default MyTest;
```

> **Note**
>
> The module files will automatically be found and loaded by `index.js` (if properly named).

## Contribution

Feel free to contribute with feedback or pull requests.
