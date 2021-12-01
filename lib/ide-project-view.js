'use babel';

export default class projectPanelView {

	constructor(serializedState) {
		console.log("[EXW-IDE] project-view constructor");

		this.panel = undefined;
		this.visible = false;

		// Create root element
		this.element = document.createElement('div');
		this.element.classList.add('exw-panel', 'tool-panel', 'focusable-panel');

		this.toolbar = document.createElement('div');
		this.toolbar.classList.add('exw-panel-toolbar');

		this.body = document.createElement('div');
		this.body.classList.add('exw-panel-contents');

		this.element.appendChild(this.toolbar);
		this.element.appendChild(this.body);

	}
	toolbarAppend(elm){
		this.toolbar.appendChild(elm);
	}
	append(elm){
		this.body.appendChild(elm);
	}
	clear(elm){
		this.body.innerHTML = '';
	}
	focus(){
		this.element.focus();
	}
	show(focus){
		var _this;
		this.panel = atom.workspace.addRightPanel({
            item: this.element,
            visible: true
        });
		this.focus();

	}
	toggle(){
		if(this.visible){
			this.panel.hide();
		}else{
			this.panel.show();
		}
		this.visible = !this.visible;
	}
	isVisible(){
		if(!this.element) return false;
		return (this.offsetWidth != 0 || this.element.offsetHeight != 0);
	}
	getTitle() {
   		return 'IDE';
 	}

	getURI() {
		// Used by Atom to identify the view when toggling.
		return 'atom://atom-ide-project-main';
	}
	getDefaultLocation() {
		return 'right';
	}
	getAllowedLocations() {
		// The locations into which the item can be moved.
		return ['left', 'right'];
	}
	getElement() {
		return this.element;
	}
	// Returns an object that can be retrieved when package is activated
	serialize() {
		return {
			deserializer: 'idePanelView'
		};
	}

	// Tear down any state and detach
	destroy() {
		this.element.remove();
	}


}
