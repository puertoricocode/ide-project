'use babel';

/*
Jose L Cuevas
https://exponentialworks.com
*/

var _atom = require("atom");
var _electron = require("electron");



var exwAtom = {
	saveCurrentState: function () {
		var paths = atom.project.getPaths();

		var uid = atom.getStateKey(paths);
		if (!uid) return Promise.resolve(null);

		let state = atom.serialize({isUnloading: true});
		return atom.stateStore.save(uid, state);
	},
	getTreeView: function() {
		var treeViewPack = atom.packages.getActivePackage('tree-view')
		if(!treeViewPack) return undefined;
		if(!treeViewPack.mainModule) return undefined;
		var view = treeViewPack.mainModule.treeView;

		return view;
	},
	createDisposable: function(fnOnDispose){
		let disposalAction = fnOnDispose;
		let o = {
			disposed: false,
			dispose: function(){
				if(this.disposed) return;
				this.disposed = true;
				if(typeof disposalAction === "function"){
					disposalAction();
				}
				disposalAction = null;
			}
		};
		return o;
	},
	createProviderRegistry: function(){
		let _self = trhis;
		let o = {_providers: []};

		o.addProvider = function(provider) {
			const index = this._providers.findIndex(p => provider.priority > p.priority);

			if (index === -1) {
				this._providers.push(provider);
			} else {
				this._providers.splice(index, 0, provider);
			}

			return _self.createDisposable(() => {
				this.removeProvider(provider);
			});
		};
		o.removeProvider = function(provider) {
			const index = this._providers.indexOf(provider);

			if (index !== -1) {
				this._providers.splice(index, 1);
			}
		};

		o.getProviderForEditor = function(editor) {
			const grammar = editor.getGrammar().scopeName;
			return this.findProvider(grammar);
		};

		o.getAllProvidersForEditor = function(editor) {
			const grammar = editor.getGrammar().scopeName;
			return this.findAllProviders(grammar);
		};

		o.findProvider = function(grammar) {
			for (const provider of this.findAllProviders(grammar)) {
				return provider;
			}

			return null;
		};

		o.findAllProviders = function *(grammar) {
			for (const provider of this._providers) {
				if (provider.grammarScopes == null || provider.grammarScopes.indexOf(grammar) !== -1) {
					yield provider;
				}
			}
		};

		return o;
	},
};

exwAtom.createDialog = function(ops){
	let dlg = {
		name: ops.name,
		panel: undefined,
		data: undefined,
	};


	dlg.element = document.createElement('div');
	dlg.element.classList.add('exw-save-dialog', 'exw-dialog-form');
	if(ops.hasOwnProperty('class')){
		dlg.element.classList.add(ops.class);
	}

	dlg.element.innerHTML = '<p class="exc-dialog-title info-message icon icon-browser" style="margin-top: 6px; margin-bottom: 6px;"></p><div class="exc-dialog-container"></div><div class="exc-dialog-footer" style="text-align: right;"><button id="cmd-ok" class="btn btn-primary" tabindex="5">Ok</button> <button id="cmd-cancel" class="btn" tabindex="5">Cancel</button></div>';

	dlg.titleNode = dlg.element.querySelector('.exc-dialog-title');
	dlg.container = dlg.element.querySelector('.exc-dialog-container');
	dlg.footer = dlg.element.querySelector('.exc-dialog-footer');
	dlg.btnOk = dlg.element.querySelector('#cmd-ok');
	dlg.btnCancel = dlg.element.querySelector('#cmd-cancel');


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
		dlg.titleNode.innerHTML = ops.title;
		if(ops.titleIcon){
			dlg.titleNode.classList.remove('icon-browser');
			dlg.titleNode.classList.add(ops.titleIcon);
		}
	}else{
		dlg.titleNode.style.display = 'none';
	}


	if(ops.hasOwnProperty('class')){
		dlg.element.classList.add(ops.class);
	}


	dlg.doCancel = function(){
		dlg.panel.hide();
		if(ops.didCancel && (typeof(ops.didCancel) == "function")){
			ops.didCancel(dlg);
		}
	};
	dlg.doConfirm = function(){
		dlg.panel.hide();
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

	dlg.$ = function(sel){
		return this.container.querySelector(sel);
	};
	dlg.panel = atom.workspace.addModalPanel({
		item: dlg.element,
		visible: false
	});

	dlg.setContents = function(any){
		if(typeof(any) == "string"){
			this.container.innerHTML = any;
		}else if(any && (typeof(any) == "object") && any.nodeType) {
			this.container.appendChild(any);
		}else if(any && (typeof(any) == "function")){
			this.container.innerHTML = any(this);
		}

		if(ops.contentsModified && (typeof(ops.contentsModified) == "function")){
			ops.contentsModified(this);
		}
	};

	dlg.setData = function(data){
		this.data = data;
		console.log("data %o", this.data);
	};
	dlg.show = function(){
		this.panel.show();
		if(ops.didShowDialog && (typeof(ops.didShowDialog) == "function")){
			ops.didShowDialog(this);
		}
	};
	dlg.hide = function(){
		this.panel.hide();
		if(ops.didCloseDialog && (typeof(ops.didCloseDialog) == "function")){
			ops.didCloseDialog(dlg);
		}
	};
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
	}

	if(ops.html){
		dlg.setContents(ops.html);
	}else if(ops.factory && (typeof(ops.factory) == "function")){
		dlg.setContents(ops.factory);
	}

	return dlg;
};



module.exports = exwAtom;
