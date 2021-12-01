'use babel';

import exwSelectList from './exwFileStore.js';

export default class exwOpenProjectView {

	constructor(serializedState) {

		this.panel = undefined;
		this.visible = false;

		// Create root element
		this.element = document.createElement('div');
		this.element.classList.add('exw-open-project-prompt');


		this.listView = new exwSelectList({
		  items: ['one', 'two', 'three'],
		  elementForItem: (item) => {
		    const li = document.createElement('li')
		    li.textContent = item
		    return li
		  },
		  didDblClickSelection: (selected) => {
			console.log('confirmed', item);
			this.hide();
		  },
		  didConfirmSelection: (item) => {
		    console.log('confirmed', item);
			this.hide();
		  },
		  didCancelSelection: () => {
		    console.log('cancelled');
			this.hide();
		  }
		})

		this.element.appendChild(this.listView.element);

		//this.setItems(sortedProjects);


	}
	focus(){
		this.listView.focusFilterEditor();
	}
	isVisible(){
		if(!this.element) return false;
		return (this.offsetWidth != 0 || this.element.offsetHeight != 0);
	}
	getTitle() {
   		return 'Open Files';
 	}
	getElement() {
		return this.element;
	}
	// Returns an object that can be retrieved when package is activated
	serialize() {
		return {}
	}
	// Tear down any state and detach
	destroy() {
		this.element.remove();
	}


}
