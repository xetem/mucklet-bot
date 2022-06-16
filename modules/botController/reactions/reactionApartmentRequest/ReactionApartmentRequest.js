import replaceTags from '#utils/replaceTags.js';
import findById from '#utils/findById.js';
import level from 'level';

// Sleep helper function
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

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
		this.allowance = 100000; // 100 second time allotment 
		this.time = Date.now();
		this.db = level('cinnabarapts', async function (err, db) {
			if (err) throw err;
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
				await this._checkAllowance(7000);
				this.module.actionAddress.enqueue(
					char.id,
					ev.char.id,
					replaceTags("I'm sorry {name}, you already have an apartment with us. If you need more space try building off of your existing room.", ev.char),
					false,
					100
				);
				this.allowance -= 7000;
				return;
			}

			await this._checkAllowance(7000);
			this.module.actionAddress.enqueue(
				char.id,
				ev.char.id,
				"Do you have an existing room that you would like to attach as your apartment? ((Reply by `address` ing me the room id to attach or simply replying `no` to continue with a new room.))",
				false,
				100
			);
			this.allowance -= 7000;
			this.inAptBuild = true;
		} 
		// Try to detect talk about changing locks.
		else if (!this.inAptBuild && !this.inAptPass && !this.inChangePass
				 && ev.msg.match(/\b(change|rename)( my)? +(locks?|passcode|apartment)\b/)) {
			//Check if we already have an apartment
			if (!await this._alreadyHasApartment(ev.char.id)) {
				await this._checkAllowance(7000);
				this.module.actionAddress.enqueue(
					char.id,
					ev.char.id,
					replaceTags("I'm sorry {name}, don't yet have an apartment for me to change the locks on.", ev.char),
					false,
					100
				);
				this.allowance -= 7000;
				return;
			}

			//TODO: Lock changing here

		} else if (this.inAptBuild){
			this.inAptBuild = false;

			if(ev.msg.match(/\bno\b/)) {
				this.roomId = "new";
			} else if (ev.msg.match(/#\w{20}/g)) {
				this.roomId = ev.msg;
			}

			await this._checkAllowance(7000);
			this.module.actionAddress.enqueue(
				char.id,
				ev.char.id,
				`Thank you, ${ev.char.name}, I'll get right on that as soon as you \`whisper\` me your preferred passphrase, it must be \`${15 - ev.char.name.replace(/[^\w]/g, '').length}\` alphanumeric characters or less.`,
				false,
				100
			);
			this.allowance -= 7000;
			this.inAptPass = true;
		} else if (this.inAptPass){
			if(ev.char.name.replace(/[^\w]/g, '').length + ev.msg.length > 15 || !(/^\w+$/.test(ev.msg))) {
				await this._checkAllowance(7000);
				this.module.actionAddress.enqueue(
					char.id,
					ev.char.id,
					`I'm sorry, ${ev.char.name}, your passphrase must be \`${15 - ev.char.name.replace(/[^\w]/g, '').length}\` alphanumeric characters [A-Za-z0-9_-] or less. Please \`whisper\` me your preferred passphrase.`,
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
		} else if (this.inChangePass){
			this.inChangePass = false;
			await this._checkAllowance(7000);
			await char.call('address', {
				msg: replaceTags("says, \"I am so sorry, {charName}, I cannot currently change locks, please send a message or mail to Xetem Ilekex to assist you.\"", {
					charName: target.name
				}),
				pose: true,
				charId: target.id
			});
		}else {
			await this._checkAllowance(7000);
			this.module.actionAddress.enqueue(
				char.id,
				ev.char.id,
				"smiles, \"I can help with setting up an apartment or changing the locks on an existing one.\"\n((To request a new apartment, type `address C1-P1 = I would like to lease an apartment.`\nTo change the lock on your apartment, type `address C1-P1 = I would like to change my locks.`))",
				true,
				100
			);
			this.allowance -= 7000; // Addresses cost 7 seconds
		}
	}

	_exec = async (player, state, outcome) => {
		let char = findById(player.controlled, outcome.charId);
		// Assert we haven't lost control of bot
		if (!char) {
			return Promise.reject(`${outcome.charId} not controlled`);
		}
		let { unitNr, target } = outcome;

		try{
			await this._checkAllowance(100000);
			await char.call('address', {
				msg: "Perfect, let me get that ready for you. Please remain here while I do so. ((Leaving the room before I return will result in an error state.))",
				charId: target.id,
			});
			await sleep(1500);
			await char.call('useExit', { exitKey: 'out' });
			await sleep(1500);
			await char.call('useExit', { exitKey: 'up' });
			await sleep(1500);
			await char.call('useExit', { exitKey: 'up' });
			await sleep(1500);
			let createExitResult = await char.call('createExit', {
				keys:  [ unitNr ],
				name: `${unitNr}`,
				leaveMsg: `goes inside ${target.name}'s apartment.`,
				arriveMsg: "enters the apartment from the hallway.",
				travelMsg: `goes inside ${target.name}'s apartment.`,
				hidden: true
			});
			await sleep(1500);
			await char.call('useExit', { exitKey: unitNr });
			await sleep(1500);
			let area = await char.call('createArea', {
				name: `${unitNr}`,
				ParentID: char.inRoom.area.id
			});
			await sleep(1500);
			await char.call('setLocation', {
				locationId: area.id,
				type: 'area',
				private: true
			});
			await sleep(1500);
			await char.call('setRoom', {
				name: `${unitNr}`,
				desc: "An empty apartment. You can change the description here with the pencil in the upper left corner of this sidebar. You can create new rooms off of this room by clicking the pencil next to the `Exit` label below.",
				areaId: area.id
			});
			await sleep(1500);
			await char.call('setExit', {
				exitKey: 'back',
				name: 'To Hallway',
				keys: [ 'exit', 'out', 'hall', 'hallway' ],
				leaveMsg: "leaves the apartment.",
				arriveMsg: `arrives from ${target.name}'s apartment.`,
				travelMsg: "leaves the apartment."
			});
			await sleep(4000);
			await char.call('requestSetRoomOwner', {
				roomId: createExitResult.targetRoom.id,
				charId: target.id
			});
			await sleep(1500);
			await char.call('requestSetAreaOwner', {
				areaId: area.id,
				charId: target.id
			});
			await sleep(1500);
			await char.call('teleportHome');
			await sleep(1500);
			await char.call('whisper', {
				msg: `says ,\"Alright, you’re all set up with your new apartment. Here are your keys, you’re passcode to access your new apartment is \`${unitNr}\` Thank you for choosing Cinnabar Prism Apartments, we hope you enjoy your stay. Feel free to have a look around the facilities.\"\n((You can get there with the commands: \`go out\`, \`go up\`, \`go up\`, \`go ${unitNr}\`.))\n((Make sure to accept the room and area requests in the Realm panel to the far left.))\n\n((I will now go in sleep mode, it may take some time for me to respond to more requests. Zzz.))`,
				pose: true,
				charId: target.id
			});
			await this.db.put(target.id, unitNr);
		} catch (err) {
			console.log(err);
			await char.call('teleportHome');
			await sleep(5000);
			await char.call('address', {
				msg: replaceTags("says, \"I am so sorry, {charName} There seems to have been an issue, please send Xetem Ilekex a message letting him know you had an issue. ((use `mail Xetem Ilekex = I had a problem leasing an apartment. The error was: '{err}'` or similar if he's not online))\"", {
					charName: target.name,
					err: err._message
				}),
				pose: true,
				charId: target.id
			});
		} finally {
			this.allowance = 0; // This is the know result of the above, either path.
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

	_updateAllowance() {
		let old = this.time;
		this.time = Date.now();
		let difference = Math.floor((this.time - old) / 1000) * 1000; // round to the most recent second
		this.allowance = Math.min(this.allowance + difference, 100000); // allowance cannot exceed 100 seconds
	}

	async _checkAllowance(cost) {
		this._updateAllowance();
		if(this.allowance < cost) {
			await sleep(Math.min(this.allowance - cost, 100000)); // will never have to sleep more than 100 seconds to recover
			this._updateAllowance(); 
		}
	}

	dispose() {
		this.module.charEvents.unsubscribe(this._onCharEvent);
		this.module.botController.removeAction('createApartment');
		this.db.close();
	}

}

export default ReactionApartmentRequest;
