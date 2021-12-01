'use babel';

import exwCommandTerminal from './exwCommandTerminal.js';

export default class exwTerminalView {

	constructor(serializedState) {

		console.log("terminal-view constructor");
		this.panel = undefined;
		this.visible = false;


		// Create root element
		this.element = document.createElement('div');
		this.element.classList.add('exw-terminal-view');

		this.__dirty = true;
		this.state = {

		};

		this.element.innerHTML = "<div id='exw-terminal-wrapper'></div>";

		this.term = new exwCommandTerminal({
			name: 'IDE',
			commandPreflight: function(term, cmd){
					return true;
			},
		});

		this.element.querySelector('#exw-terminal-wrapper').appendChild(this.term.getElement());

		this.term.setStatusText('Waiting for IDE...');
		this.term.focus();

	}
	activate(state){
		console.log("terminal-view activate");
	}
	focus(){
		this.term.focus();
	}
	isVisible(){
		if(!this.element) return false;
		return (this.offsetWidth != 0 || this.element.offsetHeight != 0);
	}
	getTitle() {
   		return 'Commando';
 	}
	getIconName() {
   		return 'rocket';
 	}
	getURI() {
		// Used by Atom to identify the view when toggling.
		return 'atom://atom-ide-terminal';
	}
	getElement() {
		return this.element;
	}
	getDefaultLocation() {
		return 'bottom';
	}
	getAllowedLocations() {
		// The locations into which the item can be moved.
		//'center', 'left', 'right', or 'bottom'.
		return ['center', 'bottom'];
	}
	// Returns an object that can be retrieved when package is activated
	serialize() {
		return {
			state: this.state,
			deserializer: 'ideTerminalView'
		}
	}

	// Tear down any state and detach
	destroy() {
		this.element.remove();
	}


}
