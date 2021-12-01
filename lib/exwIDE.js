'use babel';

/*
Jose L Cuevas
https://exponentialworks.com
*/

import { CompositeDisposable, Disposable, TextEditor, File, Directory, Emitter } from 'atom';

var _electron = require("electron");
const path = require('path');
const fs = require('fs');
const dom = require('./exwDOMHelper.js');
console.log(dom);

const exwFileStore = require('./exwFileStore.js');
const exwAtom = require('./exwAtomHelper.js');
const exwSymbolParser = require('./exwSymbolParser.js');
const exwSelectList = require('./exwSelectList.js');


console.log('IDE LOADED FROM %s',  __dirname);

let ideObject = null;

var exwIDE = {
	commands: {},
	modules:{},
	readFile: function(fpath){
		return fs.readFileSync(fpath, 'utf8');
	},
	readDataFile: function(file, opFromUser){
		let fPath = opFromUser ? this.getPathForData(file) : this.getPathForPackage(file);
		return fs.readFileSync(fPath, 'utf8');
	},
	writeFile: function(fPath, data){
		fs.writeFileSync(fpath, data);
	},
	getPathForData: function(file){
		return path.join(this.pathUserData, file);
	},
	getPathForPackage: function(file){
		return path.join(this.packagePath, file);
	},
	getConfigFile: function(file, data){
		let fPath = this.getPathForPackage(file);
		let value = data ? data : {};
		return new exwFileStore({path: fPath, isJSON: true, defaults:value});
	},
	getUserConfigFile: function(file, data){
		let fPath = this.getPathForData(file);
		let value = data ? data : {};
		return new exwFileStore({path: fPath, isJSON: true, defaults:value});
	},

	getDataFile: function(file, data){
		let fPath = this.getPathForPackage(file);
		let value = data ? data : '';
		return new exwFileStore({path: fPath, isData: true, defaults:value});
	},
	getUserDataFile: function(file, data){
		let fPath = this.getPathForData(file);
		let value = data ? data : '';
		return new exwFileStore({path: fPath, isData: true, defaults:value});
	},
	displayError: function(msg, details, icon){
		if(!icon) icon = 'bug';
		atom.notifications.addError(msg, {dismissable: true, icon:'bug',detail:details});
		console.log(msg);
	},
	addCommand: function(code, name, fn){
		let disposable = atom.commands.add('atom-workspace', code, fn);
		this.commands[code] = {
			uid: code,
			name: name,
			fn: fn,
			disposable: disposable,
		};
	},
	dispatchCommand: function(code){
		if(this.commands.hasOwnProperty(code)){
			this.commands[code].fn();
			return;
		}
		atom.commands.dispatch(atom.views.getView(atom.workspace.getActivePane()), code);
	},
	runJS: function(src, ctx, fileRef, onError){
		if(!fileRef) fileRef = 'exwide_tool_script.vm';
		const vm = require('vm');

		try {
			vm.createContext(ctx);
			vm.runInContext(src, ctx, fileRef);
		}catch(ex){
			if(onError && typeof(onError) == 'function'){
				onError(ex);
				return;
			}

			let msg = 'EXW IDE Error running script! [ERR570]';
			console.error(msg);
			console.error(ex.stack);
			this.displayError(msg, ex.stack);
		}
	},
	on: function(name, fn){
		this.emitter.on(name, fn);
	},
	disposed: false,
	dispose: function(){
		if(this.disposed) return;
		this.disposed = true;

		if(this.config){
			this.config.dispose();
		}

		let keys = Object.keys(this.commands);
		for(let k of  keys){
			let cmd = this.commands[k];
			if(cmd.disposable.disposed) continue;
			cmd.disposable.dispose();
			cmd.fn = undefined;
		};

		this.commands = null;

		this.emitter.dispose();
		this.disposables.dispose();
	}
};

exwIDE.emitter = new Emitter();
exwIDE.disposables = new CompositeDisposable();

exwIDE.pathUserData = atom.getConfigDirPath();
exwIDE.packagePath = __dirname;

//load a user config store
exwIDE.config = exwIDE.getUserConfigFile('exc_config_store.json', {});



//#MARK IDE EVENTS
exwIDE.onDidChangeActiveTextEditor = function(fn){
	this.emitter.on('did-change-active-text-editor', fn);
};


console.log("[EXW-IDE] path=%s", exwIDE.packagePath);
console.log("[EXW-IDE] path-data=%s", exwIDE.pathUserData);

exwIDE.ui = {};
exwIDE.ui.treeView = {
	module: null,
	element: null,
	groups: [],
	attachToModule: function(){
		this.groups = [];

		this.element = document.createElement('div');
    	this.element.classList.add('exw-tv-groups', 'exw-tv-groups-menu'); //, 'tree-view-scroller');

		var treeViewPack = atom.packages.getActivePackage('tree-view');
		if(!treeViewPack) return undefined;
		if(!treeViewPack.mainModule) return undefined;

		this.module = treeViewPack.mainModule.treeView;
		console.log(this.module);

		var tve = this.module.element;
		atom.commands.add('atom-workspace', 'tree-view:toggle', () => {
			if (dom.isVisible(tve)) {
				return this.show();
			} else {
				return this.hide();
			}
		});
		atom.commands.add('atom-workspace', 'tree-view:show', () => {
			this.show();
		});

		console.log(dom);

		if (dom.isVisible(tve)) {
			this.show();
		}
		console.log("[EXW-IDE] attached TreeView");

	},
	hide(){

	},
	show() {
		var tve = this.module.element;
		console.log("[EXW-IDE] show TreeView");
		//tve.find('.tree-view-scroller').css('background', tve.find('.tree-view').css('background') );

		let treeViewHeader = document.createElement('div');
		let treeViewHeaderSpan = document.createElement('span');
		let treeViewHeaderSpanStyle = document.createElement('strong');

		treeViewHeaderSpan.appendChild(treeViewHeaderSpanStyle);
		treeViewHeader.appendChild(treeViewHeaderSpan);

		treeViewHeaderSpanStyle.innerText = 'FOLDERS';
		treeViewHeader.style.paddingLeft = '5px';
		treeViewHeader.style.marginBottom = '3px';
		treeViewHeader.setAttribute('id', 'foldersLabel');


      	tve.prepend(treeViewHeader);

		tve.prepend(this.element);
	},
	createGroup: function(ops){
		var group = {ops: ops};
		group.element = document.createElement('ul');
		group.element.classList.add('list-tree', 'has-collapsable-children');
		let nested = document.createElement('li');
		nested.classList.add('list-nested-item', 'expanded');

		group.header = document.createElement('div');
		group.header.classList.add("list-item");
		group.header.setAttribute('is', 'exw-tv-group');

		nested.appendChild(group.header);

		group.container = document.createElement('ol');
		group.container.classList.add('list-tree');
		nested.appendChild(group.container);



		let headerSpan = document.createElement('span');
		group.headerTitle = document.createElement('strong');
		group.headerTitle.innerText = ops.name;
		group.header.style.paddingLeft = '5px';
		headerSpan.appendChild(group.headerTitle);

		group.header.appendChild(headerSpan);


		group.element.appendChild(nested);


		group.close = function(){
			console.log("[EXW-IDE] close group: exw-open-files-group");
		};
		atom.commands.add('div.list-item[is=exw-tv-group]', 'exw-open-files-group:close', event => {
			//group.close();
		});
		atom.commands.add('.exw-tv-groups-menu li.list-item[is=tree-view-file]', 'exw-tv-groups:copy-path', event => {
			let o = event.currentTarget;
			console.log(o);
			let span = o.querySelector("span");
			if(!span) return;
			let path = span.getAttribute("data-path");
			atom.clipboard.write(path);
		});

		atom.contextMenu.add({
			//'.exw-open-files-menu div.list-item[is=exw-open-files-group]': [{label: 'Close All', command: 'exw-open-files-group:close'}]
			'.exw-tv-groups-menu li.list-item[is=tree-view-file]': [
				{label: 'Copy path...', command: 'exw-tv-groups:copy-path'},
				{label: 'Close', command: 'core:close'}
			]
		});

		this.groups.push(group);
		this.element.appendChild(group.element);

		group.header.addEventListener('click', (event) => {
			nested.classList.toggle('expanded');
			nested.classList.toggle('collapsed');

		});

		atom.config.observe('exw-tv-group1.collapsable1', collapsable => {
			console.log("group %s collapsable %s", ops.name, collapsable);
			
		})
		return group;
	},
};

var exwDialogManager = {
	items: {},

create: function(ops){
	let dlg = {
		name: ops.name.replace(/\s/g,'_'),
		panel: undefined,
		data: undefined,
	};

	this.items[dlg.name] = dlg;

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
},
};



module.exports = {
	ide: exwIDE,
	dialogManager: exwDialogManager,
	symbolParser: exwSymbolParser,
	viewSelectList: exwSelectList,
}
