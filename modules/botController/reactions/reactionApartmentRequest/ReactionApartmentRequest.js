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
		this.allowance = 100000; // 100 second time allotment 
		this.time = Date.now();
		this.db = level('cinnabarapts', async function (err, db) {
			if (err) throw err;

			await db.get('NEXT', async function (err, value) {
				if(err) {
					await db.put('NEXT', '1E');
					await db.put('c2i9uh0t874bj4evc090', '1A'); // Xetem Ilekex is predefined as per the lore
					await db.put('c2kcgjgt874bj4evchf0', '1B'); // Cyran Bizeth is predefined as per the lore
					await db.put('RESERVED', '1C'); // Another character is predefined as per the lore
					await db.put('c31sr90t874d92krcahg', '1D'); // Cirrhen Ilekex is predefined as per the lore
					return console.log(`No apartments found in db, starting from 1E: ${err}`);
				}
				return console.log(`Found apartments in db, resuming from ${value}.`);
			})
		});

		this.app.require([ 'botController', 'charEvents', 'actionAddress' ], this._init);
	}

	_init = (module) => {
		this.module = Object.assign({ self: this }, module);

		this.module.botController.addAction({
			id: 'createApartment',
			exec: this._exec,
		});

		// Subscribes to events
		this.module.charEvents.subscribe(this._onCharEvent);
	}

	_onCharEvent = async (char, ev) => {
		// Bot only cares about messages addressed to self.
		if (ev.type != 'address' || ev.target.id != char.id) {
			return;
		}

		// Make it a little bit "smart". Try to detect talk about leasing apartments.
		if (!ev.msg.match(/\b(lease|rent|available|free)( an)? +apartments?\b/)
			&& !ev.msg.match(/\bapartments? *(available\b|to rent\b|to lease\b|free)\b/)
		) {
			await this._checkAllowance(7000);
			this.module.actionAddress.enqueue(
				char.id,
				ev.char.id,
				replaceTags("looks confused. ((Type `address C1-P1 = I would like to lease an apartment.`))", ev.char),
				true,
				100
			);
			this.allowance -= 7000; // Addresses cost 7 seconds
			return;
		}

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

		//TODO: Check if supplied with a room ID to connect instead of creating a new apartment.

		// We could just call the API directly with the steps. But by letting
		// botController perform them as an action, we can be sure the bot only
		// creates one apartment at a time.
		this.module.botController.enqueue('createApartment', {
			charId: char.id,
			target: ev.char,
			unitNr: String(await this._getNextApartmentNumber(char.id)),
			delay: 1000,
			postdelay: 2000,
			priority: 20
		});
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
				msg: "Sure thing, let me get that ready for you. Please remain here while I do so. ((Leaving the room before I return will result in an error state.))",
				charId: target.id,
			});
			await sleep(1500);
			await char.call('useExit', { exitKey: 'out' });
			await sleep(1500);
			await char.call('useExit', { exitKey: 'up' });
			await sleep(1500);
			let area = await char.call('createArea', {
				name: `Apartment ${unitNr}`,
				ParentID: char.inRoom.area.id
			});
			await sleep(1500);
			await char.call('setLocation', {
				locationId: area.id,
				type: 'area',
				private: true
			});
			await sleep(1500);
			let createExitResult = await char.call('createExit', {
				keys:  [ unitNr, target.name + " " + target.surname ],
				name: `Apartment ${unitNr}`,
				leaveMsg: `goes inside apartment ${unitNr}.`,
				arriveMsg: "enters the apartment from the hallway.",
				travelMsg: `goes inside apartment ${unitNr}`,
				hidden: true
			});
			await sleep(1500);
			await char.call('useExit', { exitKey: unitNr });
			await sleep(1500);
			await char.call('setRoom', {
				name: `Apartment ${unitNr}`,
				desc: "The apartment is empty.",
				areaId: area.id
			});
			await sleep(1500);
			await char.call('setExit', {
				exitKey: 'back',
				name: 'To Hallway',
				keys: [ 'exit', 'out', 'hall', 'hallway' ],
				leaveMsg: "leaves the apartment.",
				arriveMsg: `arrives from apartment ${unitNr}.`,
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
			await char.call('address', {
				msg: replaceTags("says ,\"Alright, you’re all set up with your new apartment. Here are your keys, you’re in unit {unitNr} Thank you for choosing Cinnabar Prism Apartments, we hope you enjoy your stay. Feel free to have a look around the facilities.\"\n((You can get there with the commands: `go out`, `go up`, `go apartment {unitNr}` (or alternatively `go {charName} {charSurname}` or simply `go {unitNr}`) ))\n((Make sure to accept the room and area requests in the Realm panel to the far left.))\n\n((I will now go in sleep mode, it may take some time for me to respond to more requests. Zzz.))", {
					unitNr,
					charName: target.name,
					charSurname: target.surname
				}),
				pose: true,
				charId: target.id
			});
			await this.db.put(target.id, unitNr);
		} catch (err) {
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
			await this.db.del(target.id);
			await this.db.put('NEXT', unitNr); // Replace the unit on NEXT
		} finally {
			this.allowance = 0; // This is the know result of the above, either path.
		}
	}

	async _alreadyHasApartment(charId) {
		try {
			let r = await this.db.get(charId);
			if (r) return true;
			return false;
		} catch (err) {
			console.log(`No apartment found for character ${charId}: ${err}`);
			await this.db.put(charId, 'WAITING');
			return false;
		}
	}

	async _getNextApartmentNumber(charId) {
		let next = await this.db.get('NEXT');
		await this.db.put('NEXT', this._incrementApartment(next));
		return next;
	}

    _incrementApartment(current) {
        if (current.charAt(current.length - 1) === 'Z') {
            current = current.replace(/(\d+)/g, function(r) {
                return +r+1;
            });
            current = current.replace('Z', 'A');
        } else {
            current = current.replace(/([A-Z])/g, function(r) {
                return String.fromCharCode(r.charCodeAt(0)+1);
            });
        }
        return current;
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