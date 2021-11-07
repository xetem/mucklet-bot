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
		this.db = level('cinnabarapts');

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

	_onCharEvent = (char, ev) => {
		// Bot only cares about messages addressed to self.
		if (ev.type != 'address' || ev.target.id != char.id) {
			return;
		}

		// Make it a little bit "smart". Try to detect talk about leasing apartments.
		if (!ev.msg.match(/\b(lease|rent|available|free)( an)? +apartments?\b/)
			&& !ev.msg.match(/\bapartments? *(available\b|to rent\b|to lease\b|free)\b/)
		) {
			this.module.actionAddress.enqueue(
				char.id,
				ev.char.id,
				replaceTags("looks confused. ((Type `address C1-P1 = I would like to lease an apartment.`))", ev.char),
				true,
				100
			);
			return;
		}

		// Check if we already have an apartment
		if (this._alreadyHasApartment(ev.char.id)) {
			this.module.actionAddress.enqueue(
				char.id,
				ev.char.id,
				replaceTags("I'm sorry {name}, you already have an apartment with us. If you need more space try building off of your existing room.", ev.char),
				false,
				100
			);
			return
		}

		// We could just call the API directly with the steps. But by letting
		// botController perform them as an action, we can be sure the bot only
		// creates one apartment at a time.
		this.module.botController.enqueue('createApartment', {
			charId: char.id,
			target: ev.char,
			unitNr: String(this._getNextApartmentNumber(char.id)),
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

		// Here we call the different commands directly against the API. We
		// sleep a little inbetween commands to avoid triggering the flood
		// filter, and to make it look more "natural".
		await char.call('address', {
			msg: "Sure thing, let me get that ready for you.",
			charId: target.id,
		});
		await sleep(1000);
		await char.call('useExit', { exitKey: 'out' });
		await sleep(1000);
		await char.call('useExit', { exitKey: 'up' });
		await sleep(1000);
		let area = await char.call('createArea', {
			name: `Apartment ${unitNr}`,
			ParentID: char.inRoom.area.id
		});
		await sleep(1000);
		await char.call('setLocation', {
			locationId: area.id,
			type: 'area',
			private: true
		});
		await sleep(1000);
		let createExitResult = await char.call('createExit', {
			keys:  [ unitNr, target.name + " " + target.surname ],
			name: `Apartment ${unitNr}`,
			leaveMsg: `goes inside apartment ${unitNr}.`,
			arriveMsg: "enters the apartment from the hallway.",
			travelMsg: `goes inside apartment ${unitNr}`,
			hidden: true
		});
		await sleep(1000);
		await char.call('useExit', { exitKey: unitNr });
		await sleep(1000);
		await char.call('setRoom', {
			name: `Apartment ${unitNr}`,
			desc: "The apartment is empty.",
			areaId: area.id
		});
		await sleep(1000);
		await char.call('setExit', {
			exitKey: 'back',
			name: 'To Hallway',
			keys: [ 'exit', 'out', 'hall', 'hallway' ],
			leaveMsg: "leaves the apartment.",
			arriveMsg: `arrives from apartment ${unitNr}.`,
			travelMsg: "leaves the apartment."
		});
		await sleep(2000);
		await char.call('requestSetRoomOwner', {
			roomId: createExitResult.targetRoom.id,
			charId: target.id
		});
		await char.call('requestSetAreaOwner', {
			areaId: area.id,
			charId: target.id
		});
		await sleep(1000);
		await char.call('teleportHome');
		await sleep(3000);
		await char.call('address', {
			msg: replaceTags("says ,\"Alright, you’re all set up with your new apartment. Here are your keys, you’re in unit {unitNr} Thank you for choosing Cinnabar Prism Apartments, we hope you enjoy your stay. Feel free to have a look around the facilities.\"\n((You can get there with the commands: `go out`, `go up`, `go apartment {unitNr}` (or alternatively `go {charName} {charSurname}` or simply `go {unitNr}`) ))\n((Make sure to accept the room and area requests in the Realm panel to the far left.))", {
				unitNr,
				charName: target.name,
				charSurname: target.surname
			}),
			pose: true,
			charId: target.id
		});

	}

	_alreadyHasApartment(charId) {
		if(this.db.get(charId, (err, value) => {
			if(err) return console.log(`Error reading from db: ${err}`);
			console.log(`Apartment Unit for ${charId}: ${value}`);
		}) !== null){
			return true;
		}
		return false;
	}

	_getNextApartmentNumber(charId) {
		let next = this.db.get('NEXT', (err, value) => {
			if(err) return console.log(`Error reading from db: ${err}`);
			console.log(`Next apartment unit: ${value}`);
		})
        this.db.del('NEXT'); //This may be optional
		this.db.put('NEXT', this._incrementApartment(next));
		this.db.put(charId, next);
		return next;
	}

    _incrementApartment(current) {
        if (current.charAt(current.length - 1) === 'Z') {
            text = text.replace(/(\d+)/, function(r) {
                return +r+1;
            });
            text = text.replace('Z', 'A');
        } else {
            text = text.replace(/([A-Z])/, function(r) {
                return String.fromCharCode(r.charCodeAt(0)+1);
            });
        }
        return current;
    }

	dispose() {
		this.module.charEvents.unsubscribe(this._onCharEvent);
		this.module.botController.removeAction('createApartment');
		this.db.close();
	}

}

export default ReactionApartmentRequest;