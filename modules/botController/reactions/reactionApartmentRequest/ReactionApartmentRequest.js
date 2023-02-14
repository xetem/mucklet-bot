import setParams from '#utils/setParams.js';
import replaceTags from '#utils/replaceTags.js';
import findById from '#utils/findById.js';
import level from 'level';

/**
 * ReactionApartmentRequest reacts to an apartment request.
 */
class ReactionApartmentRequest {

	/**
	 * Creates a new ReactionApartmentRequest instance.
	 * @param {App} app Modapp App object.
	 * @param {ReactionApartmentRequest~Params} params Module parameters.
	 */
	constructor(app, params) {
		this.app = app;
		this.inAptBuild = false;
		this.inAptPass = false;
		this.inChangePass = false;
		this.db = level('cinnabarapts', async function (err, db) {
			if (err) throw err;
		});

		setParams(this, params, {
			desc: {type: 'string', default: "An empty apartment. You can change the description here with the pencil in the upper left corner of this sidebar. You can create new rooms off of this room by clicking the pencil next to the `Exit` label below."},
			dest: {type: 'string', default: "Nowhere"},
			isBuilder: {type: 'bool', default: false},
			path: {type: 'string', default: "\`go out\`" },
		});

		this.app.require([ 'botController', 'charEvents', 'actionAddress' ], this._init);
	}

	_init = (module) => {
		this.module = Object.assign({ self: this }, module);

		this.module.botController.addAction({
			id: 'createApartment',
			exec: this._exec,
		});

		this.module.botController.addAction({
			id: 'renameApartment',
			exec: this._rename,
		})

		// Subscribes to events
		this.module.charEvents.subscribe(this._onCharEvent);
	}

	_onCharEvent = async (char, ev) => {
		// Bot only cares about messages addressed to self.
		if (ev.type != 'address' 
			&& ev.type != 'whisper' 
			|| ev.target.id != char.id
		) {
			return;
		}

		// Make it a little bit "smart". Try to detect talk about leasing apartments.
		if (!this.inAptBuild && !this.inAptPass && !this.inChangePass
			&& (ev.msg.match(/\b(lease|rent|available|free)( an)? +apartments?\b/)
			|| ev.msg.match(/\bapartments? *(available\b|to rent\b|to lease\b|free)\b/))
		) {
			// Check if we already have an apartment
			if (await this._alreadyHasApartment(ev.char.id)) {
				this.module.actionAddress.enqueue(
					ev.char.id,
					replaceTags("I'm sorry {name}, you already have an apartment with us. If you need more space try building off of your existing room.", ev.char),
					false,
					100
				);
				return;
			}

			this.module.actionAddress.enqueue(
				ev.char.id,
				"Do you have an existing room that you would like to attach as your apartment? ((Reply by `address` ing me the room id to attach or simply replying `no` to continue with a new room.))",
				false,
				100
			);
			this.inAptBuild = true;
			this.currentTarget = ev.target.id;
		} 
		// Try to detect talk about changing locks.
		else if (!this.inAptBuild && !this.inAptPass && !this.inChangePass
				 && ev.msg.match(/\b(change|rename)( my)? (locks?|passcode|apartment)\b/)) {
			//Check if we already have an apartment
			if (!await this._alreadyHasApartment(ev.char.id)) {
				this.module.actionAddress.enqueue(
					ev.char.id,
					replaceTags("I'm sorry {name}, don't yet have an apartment for me to change the locks on.", ev.char),
					false,
					100
				);
				return;
			}

			this.module.actionAddress.enqueue(
				ev.char.id,
				`I am so sorry, ${charName}, I cannot currently change locks, please send a message or mail to Xetem Ilekex to assist you.`,
				false,
				100
			);

			//TODO: Lock changing here

		} else if (this.inAptBuild && this.currentTarget === ev.target.id){
			this.currentTarget = null;
			this.inAptBuild = false;

			if(ev.msg.match(/\bno\b/)) {
				this.roomId = "new";
			} else if (ev.msg.match(/#\w{20}/g)) {
				this.roomId = ev.msg;
			}

			this.module.actionAddress.enqueue(
				ev.char.id,
				`Thank you, ${ev.char.name}, I'll get right on that as soon as you \`whisper\` me your preferred passphrase, it must be \`${15 - ev.char.name.replace(/[^\w]/g, '').length}\` alphanumeric characters or less.`,
				false,
				100
			);
			this.inAptPass = true;
			this.currentTarget = ev.target.id;
		} else if (this.inAptPass && this.currentTarget === ev.target.id){
			this.currentTarget = null;
			if(ev.char.name.replace(/[^\w]/g, '').length + ev.msg.length > 15 || !(/^\w+$/.test(ev.msg))) {
				this.module.actionAddress.enqueue(
					ev.char.id,
					`I'm sorry, ${ev.char.name}, your passphrase must be \`${15 - ev.char.name.replace(/[^\w]/g, '').length}\` alphanumeric characters \`A-Za-z0-9_-\` or less. Please \`whisper\` me your preferred passphrase.`,
					false,
					100
				);
			} else {
				this.inAptPass = false;

				// We could just call the API directly with the steps. But by letting
				// botController perform them as an action, we can be sure the bot only
				// creates one apartment at a time.
				this.module.botController.enqueue('createApartment', {
					charId: char.id,
					target: ev.char,
					roomId: this.roomId,
					unitNr: `${ev.char.name.replace(/[^\w]/g, '')}${ev.msg}`,
					delay: 1000,
					postdelay: 2000,
					priority: 20
				});
			}
			this.currentTarget = ev.target.id;
		} else if (this.inChangePass){
			this.inChangePass = false;
			
			// TODO: Lock changing here

		}else {
			this.module.actionAddress.enqueue(
				ev.char.id,
				"smiles, \"I can help with setting up an apartment or changing the locks on an existing one.\"\n((To request a new apartment, type `address C1-P1 = I would like to lease an apartment.`\nTo change the lock on your apartment, type `address C1-P1 = I would like to change my locks.`))",
				true,
				100
			);
		}
	}

	_exec = async (bot, state, outcome) => {
		let ctlr = bot.controlled;
		// Assert we haven't lost control of bot
		if (!ctrl) {
			return Promise.reject(`char not controlled`);
		}
		let { unitNr, target } = outcome;

		try{
			await char.call('address', {
				msg: "Perfect, let me get that ready for you. Please remain here while I do so. ((Leaving the room before I return will result in an error state.))",
				charId: target.id,
			});
			await char.call('teleport', { roomId: this.dest }); 
			let createExitResult = await char.call('createExit', {
				keys:  [ unitNr ],
				name: `${unitNr}`,
				leaveMsg: `goes inside ${target.name}'s apartment.`,
				arriveMsg: "enters the apartment from the hallway.",
				travelMsg: `goes inside ${target.name}'s apartment.`,
				hidden: true
			});
			let parent = char.inRoom.area.id;
			await char.call('useExit', { exitKey: unitNr });
			let area = await char.call('createArea', {
				name: `${unitNr}`,
				ParentID: parent
			});
			await char.call('setLocation', {
				locationId: area.id,
				type: 'area',
				private: true
			});
			await char.call('setRoom', {
				name: `${unitNr}`,
				desc: this.desc,
				areaId: area.id
			});
			await char.call('setExit', {
				exitKey: 'back',
				name: 'To Hallway',
				keys: [ 'exit', 'out', 'hall', 'hallway' ],
				leaveMsg: "leaves the apartment.",
				arriveMsg: `arrives from ${target.name}'s apartment.`,
				travelMsg: "leaves the apartment."
			});
			await char.call(this.isBuilder ? 'setRoomOwner' : 'requestSetRoomOwner', {
				roomId: createExitResult.targetRoom.id,
				charId: target.id
			});
			await char.call(this.isBuilder ? 'setAreaOwner' : 'requestSetAreaOwner', {
				areaId: area.id,
				charId: target.id
			});
			await char.call('teleportHome');
			await char.call('whisper', {
				msg: `says ,\"Alright, you’re all set up with your new apartment. Here are your keys, you’re passcode to access your new apartment is \`${unitNr}\` Thank you for choosing Cinnabar Prism Apartments, we hope you enjoy your stay. Feel free to have a look around the facilities.\"\n((You can get there with the commands: ${this.path}, \`go ${unitNr}\`.))`,
				pose: true,
				charId: target.id
			});
			await this.db.put(target.id, unitNr);
		} catch (err) {
			console.log(err);
			await char.call('teleportHome');
			await char.call('address', {
				msg: replaceTags("says, \"I am so sorry, {charName} There seems to have been an issue, please send Xetem Ilekex a message letting him know you had an issue. ((use `mail Xetem Ilekex = I had a problem leasing an apartment. The error was: '{err}'` or similar if he's not online))\"", {
					charName: target.name,
					err: err._message
				}),
				pose: true,
				charId: target.id
			});
		} finally {
		}
	}

	_rename = async (player, state, outcome) => {
		//TODO Rename logic here.
	}

	async _alreadyHasApartment(charId) {
		try {
			let r = await this.db.get(charId);
			if (r) return true;
			return false;
		} catch (err) {
			console.log(`No apartment found for character ${charId}: ${err}`);
			return false;
		}
	}

	dispose() {
		this.module.charEvents.unsubscribe(this._onCharEvent);
		this.module.botController.removeAction('createApartment');
		this.db.close();
	}

}

export default ReactionApartmentRequest;
