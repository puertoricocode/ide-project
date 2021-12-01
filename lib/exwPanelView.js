/*
Jose L Cuevas
https://exponentialworks.com
*/

console.log('@exwDocuments');

const { CompositeDisposable, Disposable, TextEditor, File, Directory, Emmiter } = require('atom');

const { ide, dialogManager } = require('./exwIDE.js');
const dom = require('./exwDOMHelper.js');

const _atom = require('./exwAtomHelper.js');

let exwPanelManager;

let exwPanelView = {
	_isPanelView: true,
	_isVirgin: true,
	visible: false,
	isModal: false,
	name: 'generic-view',
	element: null,
	title: 'Panel',
	icon: null,
	data: {},
	state: {},
	defaultLocation: 'bottom',
	deserializer: '',
	allowedLocation: ['center', 'left', 'right', 'bottom'],

	deactivate: function() {
		//#MARK EMIT did-panel-deactivated
		ide.emitter.emit('did-panel-deactivated', this);
		this.dispose();
	},
	getTitle: function(){
		return this.title;
	},
	getIconName: function(){
		return this.icon;
	},
	getURI: function(){
		// Used by Atom to identify the view when toggling.
		return 'atom://exw-ide-' + this.name;
	},
	getElement: function(){
		return this.element;
	},
	getDefaultLocation: function() {
		return this.defaultLocation;
	},
	getAllowedLocations: function() {
		// The locations into which the item can be moved.
		//'center', 'left', 'right', or 'bottom'.
		return this.allowedLocation
	},
	setData: function(data){
		this.data = data;
	},
	setDelegate: function(obj){
		this.owner = obj;
	},
	$: function(sel){
		return dom.get(sel,this.element);
	},
	with: function(sel){
		let target = this.body;

		if(sel == 'body'){
			target = this.body;
		}else if(sel == 'footer'){
			target = this.footer;
		}else if(sel == 'header'){
			target = this.header;
		}else{
			target = dom.get(sel,this.element);
		}

		return {
			element: target,
			append: function(s){
				if(!target) return target;
				dom.append(target, s);
			},
			hasClass: function(n) {
				if(!target) return false;
				return dom.hasClass(target,n);
			},
			addClass: function(n) {
				if(!target) return target;
				dom.addClass(target, n);
				return target;
			},
			removeClass: function(n) {
				if(!target) return target;
				dom.removeClass(target, n);
				return target;
			},
			prepend: function(n) {
				if(!target) return target;
				dom.prepend(target, n);
				return target;
			}
		};
	},
	append: function(place, s){
		let target = this.body;

		if(place == 'header'){
			target = this.header;
		}else if(place == 'footer'){
			target = this.footer;
		}

		dom.append(target, s);

		return this;
	},
	isVisible1: function(){
		if(!this.element) return false;
		return (this.offsetWidth != 0 || this.element.offsetHeight != 0);
	},
	isVisible: function(){
		if(!this.panel){
			this.panel = atom.workspace.panelForItem(this);
		}
		if(this.panel){
			this.visible = this.panel.isVisible();
		}else{
			this.visible = false;
		}

		return this.visible;
	},
	handleActive: function(){
		viewDispatchEvent(this, 'didActivate', this.panel, this.panel);
		if(this.onDidActivate){
			this.onDidActivate(this);
		}

		ide.emitter.emit('did-view-activate', this);
	},
	handleDeactive: function(){
		viewDispatchEvent(this, 'didDeactive', this.panel);
		if(this.onDidDeactive){
			this.onDidDeactive(this);
		}

		ide.emitter.emit('did-view-deactivate', this);
	},
	handleClose: function(){
		this.visible = false;

		viewDispatchEvent(this, 'didClose', this.panel);

		if(this.onDidClose){
			this.onDidClose(this);
		}

		ide.emitter.emit('did-view-close', this);
	},
	handleShow: function(){
		if(!this.panel){
			this.panel = atom.workspace.panelForItem(this);
		}

		this.visible = true;
		viewDispatchEvent(this, 'didShow', this.panel);
		if(this.onDidShow){
			this.onDidShow(this);
		}

		ide.emitter.emit('did-view-show', this);
	},
	deactivate: function(){

	},
	show: function(){
		if(this.isModal){

			if(!this.panel){
				this.panel = atom.workspace.panelForItem(this);
			}

			if(!this.panel) return;

			this.panel.show();
			this.visible = true;
			this.handleShow();
		}else{
			atom.workspace.open(this);
		}
	},
	hide: function(){
		if(this.isModal){

			if(!this.panel){
				this.panel = atom.workspace.panelForItem(this);
			}

			if(!this.panel) return;

			this.panel.hide();
			this.visible = true;
			this.handleClose();
		}else{
			atom.workspace.hide(this);
		}
	},
	// Returns an object that can be retrieved when package is activated
	serialize() {
		return {
			state: this.state,
			deserializer: this.deserializer
		}
	},
	// Tear down any state and detach
	destroy: function(){
		this.element.remove();
		ide.emitter.emit('did-panel-deactivated', this);
		this.dispose();
	},
	disposed: false,
	dispose: function(){
		if(this.disposed) rteurn;
		this.disposed = true;

		if(this.disposables) this.disposables.dispose();
	},
};

function viewDispatchEvent(view, msg ){

	if(!view) return;
	let args = Array.prototype.slice.call(arguments);
	console.log(args);
	args = [view].concat(args.slice(2));

	let m = view.name + '_' + msg;
	console.log("[EXW-IDE] view dispatch %s", m);
	if(!view.owner) return;

	if(view.owner[m] && typeof(view.owner[m]) == "function"){
		console.log("[EXW-IDE] view dispatched %s", m);
		view.owner[m].apply(view.owner, args);
	}
}


function viewFactory(ops){

	if(!ops.name) return null;

	let view = Object.create(exwPanelView);


	view.id = exwPanelManager.lastId++;
	view.disposables = new CompositeDisposable();

	if(ops.deserializer){
		view.deserializer = ops.deserializer;
	}

	const cfgCopy = ['title', 'name','icon','allowedLocation', 'defaultLocation', 'deserializer'];
	for(let k of cfgCopy){
		if(ops.hasOwnProperty(k)) view[k] = ops[k];
	}

	view.name = view.name.replace(/-/g,'_');
	exwPanelManager.items.set(view.id, view);

	view.element = document.createElement('div');
	view.element.classList.add('exw-panel', 'focusable-panel', 'panel-' + view.name);

	view.header = document.createElement('div');
	view.header.classList.add('exw-panel-header');
	view.element.appendChild(view.header);

	view.closeButton = document.createElement('div');
	view.closeButton.classList.add('exw-panel-close', 'icon', 'icon-remove-close');
	view.header.appendChild(view.closeButton);

	view.body = document.createElement('div');
	view.body.classList.add('exw-panel-contents');
	view.element.appendChild(view.body);

	view.footer = document.createElement('div');
	view.footer.classList.add('exw-panel-footer');
	view.element.appendChild(view.footer);


	if(ops.hasOwnProperty('class')){
		view.element.classList.add(ops.class);
	}
	view.setContents = function(any){
		let src;
		if(typeof(any) == "string"){
			src = any;
		}else if(any && (typeof(any) == "object") && any.nodeType) {
			src = any;
		}else if(any && (typeof(any) == "function")){
			src = any(this);
		}

		this.body.innerHTML = "";
		if(src){
			dom.append(this.body, src);
		}
		if(ops.contentsModified && (typeof(ops.contentsModified) == "function")){
			ops.contentsModified(this);
		}
	};

	if(ops.onDidShow && (typeof(ops.onDidShow) == "function")){
		view.onDidShow = ops.onDidShow;
	}
	if(ops.onDidClose && (typeof(ops.onDidClose) == "function")){
		view.onDidClose = ops.onDidClose;
	}
	if(ops.onDidHide && (typeof(ops.onDidHide) == "function")){
		view.onDidHide = ops.onDidHide;
	}
	if(ops.onDidActivate && (typeof(ops.onDidActivate) == "function")){
		view.onDidActivate = ops.onDidActivate;
	}

	if(ops.modal === true){
		view.isModal = true;
		view.panel = atom.workspace.addModalPanel({
			item: view.element,
			visible: false
		});
	}


	view.closeButton.addEventListener('click', (event) => {
		viewDispatchEvent(view, 'willClose');
		view.hide();
		if(ops.onDidHide && (typeof(ops.onDidHide) == "function")){
			ops.onDidHide();
		}

		if(ops.onDidClose && (typeof(ops.onDidClose) == "function")){
			ops.onDidClose();
		}

		viewDispatchEvent(view, 'didCancel');
		if(ops.didCancel && (typeof(ops.didCancel) == "function")){
			ops.didCancel(dlg);
		}
	});
	
	console.log('created view %s', view.name, view);

	return view;
}

function viewDialogFactory(ops){

	let dlg = viewFactory(ops);
	if(!dlg) return null;


	dlg.element.classList.add('exw-dialog-form');
	dlg.body.classList.add('exc-dialog-container');
	dlg.footer.classList.add('exc-dialog-footer');

	dlg.append('header', '<p class="exc-dialog-title info-message icon icon-browser" style="margin-top: 6px; margin-bottom: 6px;"></p>');
	dlg.titleNode = dlg.$('.exc-dialog-title');

	dlg.footer.setAttribute('style', "text-align: right;");
	dlg.append('footer', '<button id="cmd-ok" class="btn btn-primary" tabindex="5">Ok</button> <button id="cmd-cancel" class="btn" tabindex="5">Cancel</button>');

	dlg.btnOk = dlg.$('#cmd-ok');
	dlg.btnCancel = dlg.$('#cmd-cancel');


	dlg.setTitle = function(title, titleIcon){
		if(title){
			this.titleNode.innerHTML = title;
			if(titleIcon){
				this.titleNode.classList.remove('icon-browser');
				this.titleNode.classList.add(titleIcon);
			}
		}else{
			this.titleNode.style.display = 'none';
		}
	};

	dlg.doCancel = function(){
		viewDispatchEvent(dlg, 'willClose');
		if(ops.didCancel && (typeof(ops.didCancel) == "function")){
			ops.didCancel(dlg);
		}
		dlg.hide();

		viewDispatchEvent(dlg, 'didCancel');
		if(ops.didCancel && (typeof(ops.didCancel) == "function")){
			ops.didCancel(dlg);
		}
	};

	dlg.doConfirm = function(){
		viewDispatchEvent(dlg, 'willClose');
		dlg.hide();

		viewDispatchEvent(dlg, 'didConfirm');

		if(ops.didConfirm && (typeof(ops.didConfirm) == "function")){
			ops.didConfirm(dlg);
		}
	};

	dlg.btnOk.addEventListener('click', (event) => {
		dlg.doConfirm();
	});
	dlg.btnCancel.addEventListener('click', (event) => {
		dlg.doCancel();
	});

	dlg.element.addEventListener('keydown', (event) => {
		//console.log('dialog.keydown(%s)', event.code);
		if(event.code == 'Escape'){
			event.preventDefault();
			event.stopImmediatePropagation();
			dlg.doCancel();
		}
	});



	if(ops.hasOwnProperty('btnOk')){
		if(ops.btnOk === false){
			dlg.btnOk.style.display = 'none';
		}else{
			if(ops.btnOk.caption){
				dlg.btnOk.textContent = ops.btnOk.caption;
			}
			if(ops.btnOk.icon){
				dlg.btnOk.classList.add('icon', ops.btnOk.icon);
			}
		}
	}
	if(ops.hasOwnProperty('btnCancel')){
		if(ops.btnCancel === false){
			dlg.btnCancel.style.display = 'none';
		}else{
			if(ops.btnCancel.caption){
				dlg.btnCancel.textContent = ops.btnCancel.caption;
			}
			if(ops.btnCancel.icon){
				dlg.btnCancel.classList.add('icon', ops.btnCancel.icon);
			}
		}
	}


	if(ops.title){
		dlg.setTitle(ops.title, ops.titleIcon);
	}else{
		dlg.setTitle(null);
	}

	if(ops.html){
		dlg.setContents(ops.html);
	}else if(ops.factory && (typeof(ops.factory) == "function")){
		dlg.setContents(ops.factory);
	}

	return dlg;
}


ide.disposables.add(atom.workspace.onWillDestroyPaneItem(function(event){

	let item = event.item;
	let panel = (event.pane);
	console.log('GOT onWillDestroyPaneItem ON %o', item);
	if(!item || !item._isPanelView) return;

	if(!exwPanelManager.items.has(item.id)) return;
	let view = exwPanelManager.items.get(item.id);

	console.log('GOT willDestroy ON %d', view.id);
	view.handleClose();

}));
ide.disposables.add(atom.workspace.onDidAddPaneItem(function(event, item, pane){

	item = (event.item || item);
	let panel = (event.pane || pane);

	console.log('GOT onDidAddPaneItem ON %o', item);

	if(!item || !item._isPanelView) return;

	if(!exwPanelManager.items.has(item.id)) return;
	let view = exwPanelManager.items.get(item.id);
	if(view.panel != panel) view.panel = panel;

	console.log('GOT didShow ON %d', view.id);
	view.handleShow();


}));
ide.disposables.add(atom.workspace.onDidChangeActivePane(function(pane){
	let item = pane.getActiveItem();
	console.log('GOT onDidChangeActivePane ON %o', item);

	let view;

	if(item && item._isPanelView){
		if(exwPanelManager.items.has(item.id)){
			view = exwPanelManager.items.get(item.id);
			console.log('GOT ACTIVATED ON %d', view.id);
			view.handleActive();
		}
	}

	for(let [id, aView] of exwPanelManager.items){
		if(view && (id == view.id)) continue;
		if(aView.visible) aView.handleDeactive();
	}
}));

ide.disposables.add(atom.workspace.addOpener(function(uri){
	for(let [uid, view] of exwPanelManager.items){
		if(view.getURI() == uri){
			return view;
		}
	}
}));

exwPanelManager = {
	lastId: 89000,
	items: new Map(),
	create: function(ops){
		let view = viewFactory(ops);
		return view;
	},
	createDialog: function(ops){
		let view = viewDialogFactory(ops);
		return view;
	},
	disposed: false,
	dispose: function(){
		if(this.disposed) rteurn;
		this.disposed = true;
	},
};


module.exports = exwPanelManager;
