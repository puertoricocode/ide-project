'use babel';

/*
Jose L Cuevas
https://exponentialworks.com
*/

import {exwAtom}  from './exwAtomHelper.js';


import exwFileStore from './exwFileStore.js';
import exwSelectList from './exwSelectList.js';
import  projectPanelView  from './ide-project-view.js';
import  exwTerminalView  from './ide-terminal-view.js';

import { CompositeDisposable, Disposable, TextEditor, File, Directory, Emitter } from 'atom';

const { ide, dialogManager } = require('./exwIDE.js');
const documentManager = require('./exwDocuments.js');
const panelManager = require('./exwPanelView.js');


const project = require('./exwProjectController.js');
const commando = require('./exwCommando.js');


//modules
const _electron = require("electron");
const path = require('path');
const fs = require('fs');

function replaceAll(string, search, replace) {
  return string.split(search).join(replace);
}


var exwController = {
	ide: ide,
	documentManager: documentManager
};

module.exports = exwController;


ide.controller = exwController;
ide.project = project;
ide.documentManager = documentManager;
ide.commando = commando;


atom.themes.requireStylesheet( ide.getPathForPackage('../styles/exw-select-list.less') );
atom.themes.requireStylesheet( ide.getPathForPackage('../styles/exw-command-terminal.less') );



(function(){

	let openFilesView;


	let openFilesList = new exwSelectList({
		title:'Tabs currently open...',
		titleIcon: 'icon-file-text',
		selectMultiple: true,
		didConfirmSelection: (selected) => {
			console.log('selected items %o', selected);
			let item = selected[0];
			let path = item.getAttribute('data-file-path');
			console.log('confirmed %o', item);
			console.log('file-path=%s', path);
			openFilesView.hide();

			atom.workspace.open(path);
		},
		didCancelSelection: () => {
			console.log('cancelled');
			openFilesView.hide();
		}

	});


	openFilesView = panelManager.createDialog({
		modal: true,
		name: 'open-tabs',
		title: 'Open Tabs...',
		titleIcon: 'file-text',
		btnOk: false,
		btnCancel: false,
		didConfirm: (dlg) =>{

		},
		onDidShow: (dlg)=> {
			console.log("@open-TABS.onDidShow");
			var listItems = [];

			let panes = atom.workspace.getCenter().getPanes();
			for(let pane of panes){
				let items = pane.getItems();
				for(let item of items){
					if (!atom.workspace.isTextEditor(item)) continue;
					if(item.getTitle() == "untitled") continue;

					let e = {
						primaryLine: item.getTitle(),
						secondaryLine: item.getPath(),
						icon: 'icon-file-text',
						data: {'file-path': item.getPath() }
					};
					listItems.push(e);
				}
			}

			openFilesList.setItems(listItems);
			openFilesList.focusFilterEditor();
		},
		contentsModified: (dlg) => {

		}
	});

	openFilesView.setContents(openFilesList.getElement());

	//#MARK COMMAND exw-ide:show-open-tabs
	ide.addCommand('exw-ide:show-open-tabs', 'Show Open tabs...', () => {
		openFilesView.show();
	});
})();


//#MARK EXWCONTROLLER decorate
exwController.activate = function(state){
	console.log('[EXW-IDE] controller active');
	console.log('ide-project was toggled!');

	//#MARK Bootload the IDE
	project.activate();
	documentManager.activate();
	commando.activate()

	ide.dispatchCommand('exw-ide:show-explorer');
};
exwController.destroy = function(){
	ide.dispose();
};
exwController.deactivate = function(){
	ide.dispose();
};
exwController.serialize = function(){
	return {};
};

exwController.getScriptContext = function(){
	const path = require('path');
	const fs = require('fs');

	let doc = documentManager.activeDoc;
	let editor = (doc) ? doc.textEditor : null;
	let exwIDE = this;

	let ctx = {};
	ctx.atom = atom;
	ctx.fs = fs;
	ctx.path = path;
	ctx.console = console;
	ctx.ide = {
		getDocument: () => {
			if(!doc) return null;
			return doc;
		},
		getTextEditor: () => {
			if(!doc) return null;
			return editor;
		},
		config: {
			set: (k, v) => {
				if(!ide.config) return;
				ide.config.set(k, v);
				console.log('config.set(%s) = %s', k, v);
			},
			get: (k) => {
				if(!ide.config) return undefined;
				if(ide.config.data.hasOwnProperty(k)){
					return ide.config.data[k];
				}
				return undefined;
			},
			save: () => {
				if(!ide.config) return;
				ide.config.save();
			},
		},
		spawn: function (cmd, args, options){
			//https://nodejs.org/api/child_process.html
			const { spawn } = require('child_process');
			const p = spawn(cmd, args, options);

			return new Promise(function(resolve, reject){
				var std="",stderr="", code=0;
				p.stdout.on('data', (data) => {
					std += data;
				});
				p.stderr.on('data', (data) => {
					stderr += data;
				});

				p.on('close', (code) => {
					resolve({code:code, "stdout": std, "stderr": stderr});
				});
			});
		},
		exec: function(cmd, options){
			//https://nodejs.org/api/child_process.html
			const { exec } = require('child_process');
			const p = exec(cmd, options);

			return new Promise(function(resolve, reject){
				var std="",stderr="", code=0;
				p.stdout.on('data', (data) => {
					std += data;
				});
				p.stderr.on('data', (data) => {
					stderr += data;
				});
				p.on('close', (code) => {
					resolve({code:code, "stdout": std, "stderr": stderr});
				});
			});
		},
	};
	ctx.ide.editor = {
		getLanguage: () => {
			if(!doc) return '';
			var src = editor.getText();
			return editor.getGrammar().id;
		},
		getLength: () => {
			if(!doc) return 0;
			let src = '' + editor.getText();
			return src.length;
		},
		getValue: () => {
			if(!doc) return '';
			let src = '' + editor.getText();
			return src;
		},
		setValue: (s) => {
			if(!doc) return;
			editor.setText(s);
		},
		insertText: (s, selected) => {
			if(!doc) return;
			let ops = {
				select: (selected ? true: false)
			};

			editor.insertText(s, ops);
		},
		getSelection: () => {
			if(!doc) return '';
			return editor.getSelectedText();
		},
		getTitle: () => {
			if(!doc) return '';
			return editor.getTitle();
		},
		getPath: () => {
			if(!doc) return '';
			return editor.getPath();
		},
		getFileName: () => {
			if(!doc) return '';
			return editor.getFileName() || 'untitled';
		}
	};

	return ctx;
};

exwController.prjPanelRestore = function(state) {
	return project.restorePanelView(state);
};
exwController.commandoPanelRestore = function(state) {
	return commando.restorePanelView(state);
};

var testOld = {
	packagePath: '',

	disposables: null,
	modalPanel: null,
	subscriptions: null,

	ideConsole: console,

	documents: [],
	docActive: null,
	ready: {
		ide: false,
		prjview: false,
		prjsymbols: false,
		prjbookmarks: false,
		terminal: false,
		lang_doc: false,
		tools: false,
	},
	projectPanel: {
		view: null,
		element: null,
		toolbar: null,
	},
	lists: {
		sym: null,
		bm: null,
		prj: null,
	},
	ideCreateView: function(){
		this.projectPanel.view = new projectPanelView();
		this.projectPanel.view.controller = this;
		this.ready.prjview = true;
	},
	ideRestoreView: function(serialized) {
		if(!this.projectPanel.view){
			this.ideCreateView();
		}

		return this.projectPanel.view;
	},
	ideViewToogle: function() {
		console.log('ide-project was toggled!');
		atom.workspace.toggle('atom://atom-ide-project-main');
	},
	activate: function(state) {
		var exwIDE = this;
		console.log("ide-project activate");

	},
	activate1: function(state) {
		var exwIDE = this;
		console.log("ide-project activate");





    	if(!this.projectPanel.view){
			this.ideCreateView();
		}

		this.buildPanel(this.projectPanel.view);


		this.ideInitialize();


		// Register command that toggles this view
		//#MARK ADD-COMMANDS
    	this.disposables.add(atom.commands.add('atom-workspace', {
			'ide-project:toggle': () => exwIDE.ideViewToogle(),
			'ide-project:toggle-open-files': () => { exwIDE.openFilesToggle() },
			'ide-project:save-project': () => { exwIDE.prjSaveCurrent(); },
			'ide-project:open-project': () => { exwIDE.prjOpenProjectToggle() },
			'ide-project:toggle-terminal': () => { exwIDE.terminalViewToogle() },
			'ide-project:show-symbols': () => { exwIDE.symShowView() },
			'ide-project:show-php-functions': () => {
				exwIDE.ideShowFNDocs('php');
			},
			'ide-project:edit-sym-grammer': () => {
    			atom.workspace.open(exwIDE.symGrammerStore.path);
    		}


    	}));

		this.disposables.add(atom.workspace.addOpener(uri => {
			if (uri === 'atom://atom-ide-project-main') {
				return exwIDE.projectPanel.view;
			}
      	}));

		this.disposables.add(atom.workspace.addOpener(uri => {
			if (uri === 'atom://atom-ide-terminal') {
				return exwIDE.terminalCreateView();
			}
      	}));



		const watchedEditors = new WeakSet();
		this.disposables.add(atom.workspace.observeTextEditors(textEditor => {
	 		if (watchedEditors.has(textEditor)) {
	   			return
	 		}

			console.log("observe new");
			var doc = exwIDE.docCreate(textEditor);
			if(!doc) return;
			exwIDE.documents.push(doc);

			exwIDE.disposables.add(textEditor.onDidDestroy(() => {
				exwIDE.docRemove(doc);
				doc.destroy();
	   			watchedEditors.delete(textEditor);
			}));


		}));

		this.disposables.add(atom.workspace.getCenter().observeActivePaneItem(item => {
			exwIDE.eventActiveEditorChanged(item);
		}));


		this.activePaths = atom.project.getPaths();
		console.log('prj1 paths=%o', this.activePaths);
    	atom.project.onDidChangePaths(() => {
      		console.log('prj2 paths=%o', atom.project.getPaths());
     	});




		console.log("ide-project: activate done");

	},
	destroy: function() {
		ide.dispose();
	},
	deactivate: function() {
		ide.dispose();

		if(this.lists.sym){
			this.lists.sym.destroy();
			if(this.lists.sym.disposables) this.lists.sym.disposables.dispose();
		}
		if(this.lists.bm){
			this.lists.bm.destroy();
			if(this.lists.bm.disposables) this.lists.bm.disposables.dispose();
		}
		if(this.lists.tools){
			this.lists.tools.destroy();

			if(this.lists.tools.disposables) this.lists.tools.disposables.dispose();
		}

		if(this.openFilesModal){
			this.openFilesModal.destroy();
		}

		if(ide.config){
			ide.config.save();
			ide.config.dispose();
		}
	},
	serialize: function() {

		return {

		};
	},

	initialize: function(){
		if(this.ready.ide) return;




		controller.ready.prjview
		let ready = {
			ide: false,
			prjview: false,
			prjsymbols: false,
			prjbookmarks: false,
			tools: false,
			terminal: false,
			lang_doc: false,
		};
		if(this.ready.ide){
			this.initializeIDE();
		}
		if(this.ready.tools){
			this.initializeTools();
		}

		this.initializeSymbols();
		this.openFilesInitialize();
		this.prjInitialize();

		this.langs = {};
		this.phpInitialize();
		this.terminalInitialize();
	},

	initializeBookmarks: function(){

	},
	initializeTools: function(){

		if(this.ready.tools) return;


		this.ideUserTools = {
			hooks: {
				onSave: []
			},
			tools: {

			}
		};

		//load tools
		let configFolder = new Directory(this.pathUserData);
		var toolsFolder = configFolder.getSubdirectory('exw-ide-tools');

		//console.log("Loading Tools from %s", toolsFolder.getPath());

		toolsFolder.exists().then(exist =>{
			if(!exist) return;
			toolsFolder.getEntries((err, files)=>{
				for(var i=0; i<files.length; i++){
					var file = files[i];
					if(file.isDirectory()) continue;
					this.ideAddTool(file);
				}
			});
		});

		this.ready.tools = true;
	},
	initializeSymbols: function(){

		if(this.ready.prjsymbols) return;
		this.parser = exwSymbolParser;

		let pathGrammerDefaults = this.getPathForPackage('config/default_sym_grammer.js');


		console.log('grammer defaults= %s', pathGrammerDefaults);

		let jsData = fs.readFileSync(pathGrammerDefaults, 'utf8');

		this.symGrammerStore = new exwFileStore({path: pathUserGrammer, isJS: true, defaults:jsData});


		if(!this.symGrammerStore){
			ide.displayError('EXW IDE failed to load config file for symbol grammers! [ERR561]');
		}else{
			this.eventReloadSymGrammer();
		}

		this.symCreateDialog();

		this.ready.prjsymbols = true;
	},
	consumeConsole: function(createConsole){
		this.ideConsole = createConsole({id: 'exw-ide', name: 'EXW-IDE'});
		this.ideConsole.log('A message!');
		this.ideConsole.error('A test error');
		return new Disposable(() => { this.ideConsole = console; });
	},

	buildPanel: function(panel){
		var exwIDE = this;
		if(!panel) return;

		atom.themes.requireStylesheet(path.join(this.packagePath, '/styles/exw-select-list.less'));
		atom.themes.requireStylesheet(path.join(this.packagePath, '/styles/exw-command-terminal.less'));

		this.projectPanel.element = panel.element;

		// Create toolbar
		this.projectPanel.toolbar = document.createElement('div');
		this.projectPanel.toolbar.classList.add('exw-tool-bar', 'tool-bar', 'tool-bar-top', 'tool-bar-horizontal', 'tool-bar-12px');
		panel.toolbarAppend(this.projectPanel.toolbar);

		let tb = this.projectPanel.toolbar;

		//filter textbox
		var txt = document.createElement('input');
		txt.setAttribute("type","text");
		txt.setAttribute("placeholder","filter");
		txt.setAttribute("title","filter symbols...");
		txt.classList.add('nst-filter-txt', 'native-key-bindings');

		tb.appendChild(txt);

		let searching = false;
		txt.addEventListener('input', (event) => {
			event.preventDefault();
			event.stopImmediatePropagation();
			if(searching) return;
			searching = true;
			let s = txt.value;

			//this.eventFilterTextChanged(s);
			searching = false;
		});

		txt.addEventListener('blur', (e)=>{
			//_view.handleFilter(txt.value);
		});
		txt.addEventListener('keypress', (e)=>{
			if(e.keyCode == 13 || e.keyCode == 10){
				let s = txt.value;
				this.eventFilterTextChanged(s);
			}
		});



		var btn = document.createElement('button');
		btn.classList.add('btn', 'btn-default','tool-bar-btn','exw-tool-btn-with-icon','is-close');
		tb.appendChild(btn);

		btn.addEventListener('click', function(e){
			if(txt.value == '') return;
			txt.value = '';
			exwIDE.eventFilterTextChanged('');
		});

		this.lists.bm = new exwListTree({ attr:{id:'nst-bm-tree'}, caption:'BOOKMARKS', isFolder: true, isRoot: true, isExpanded: false });
		this.lists.sym = new exwListTree({ attr:{id:'nst-sym-tree'}, caption:'SYMBOLS', isFolder: true, isRoot: true, isExpanded: true });
		this.lists.tools = new exwListTree({ attr:{id:'nst-tools-tree'}, caption:'TOOLS', isFolder: true, isRoot: true, isExpanded: false });

		panel.append(this.lists.bm.element);
		panel.append(this.lists.sym.element);
		panel.append(this.lists.tools.element);

	},

	eventReloadSymGrammer: function(){
		if(!this.symGrammerStore) return;

		const vm = require('vm');
		var ctx = {grammers: undefined };
		let src = this.symGrammerStore.data;

		vm.createContext(ctx);
		vm.runInContext(src, ctx);

		if(!ctx.grammers){
			ide.displayError('EXW IDE failed to load config file for symbol grammers! [ERR562]');
			return;
		}

		let keys = Object.keys(ctx.grammers);
		for( let grammarId of keys){
			this.parser.addGrammer(grammarId, ctx.grammers[grammarId]);
		}
	},
	eventTerminalCreated: function(term){


	},
	eventInvalidateSymbols: function(){

		if(this.docActive){
			this.symBuildState(this.docActive);
		}
	},
	eventBookmarksChanged: function(){
		if(this.docActive){
			this.bmPopulateList();
		}
	},
	eventFilterTextChanged: function(text){
		console.log('filter changed %s', text);

		let scope, cmd, arg;
		if(text.indexOf(':') >= 0){
			[scope, cmd] = text.split(/:/g);
		}else{
			cmd = text;
		}

		if(cmd == "sym"){
			this.symShowView();
			return;
		}
		if(scope && cmd){
			if(scope == 'sym'){
				switch (s) {
					case expression:

						break;
					default:

				}
			}
		}else{

		}

	},
	eventSymItemClicked: function(listItem){
		//console.log('eventSymItemClicked %o', listItem);

		if(!this.docActive) return;

		//console.log(listItem.data);
		let line = listItem.data.row;

		this.docActive.textEditor.scrollToBufferPosition([line, 1]);
		this.docActive.textEditor.setCursorBufferPosition([line, 1]);
        this.docActive.textEditor.moveToFirstCharacterOfLine();
	},
	eventNoActiveDoc: function(){
		console.log('eventNoActiveDoc');
	},
	eventActiveDocChanged: function(){
		//console.log('eventActiveDocChanged');
		this.eventBookmarksChanged();
		this.eventInvalidateSymbols();
	},
	eventActiveDocSaved: function(path){
		//console.log('eventActiveDocSaved');
		this.eventInvalidateSymbols();

		if(this.ideUserTools){
			console.log(this.ideUserTools.hooks)
			for(let uid of this.ideUserTools.hooks.onSave){
				this.ideRunToolWithUID(uid, 'onSave');
			}

		}
	},
	eventActiveDocCursorPositionChanged: function(p){
		//console.log('eventActiveDocCursorPositionChanged');
		//console.log('CURSOR IS AT LN:%d ROW:%d', p.row, p.column);
		if(!this.docActive) return;

		if(this.docActive.lastPosition.row != p.row){
			this.symSelectCloseToRow(p.row);
		}

	},
	eventActiveDocSelectionChanged: function(){
		//console.log('eventActiveDocSelectionChanged');
		//if(!this.docActive) return;

	},
	eventActiveEditorChanged: function(item){
		//the editor in the center panel was replaced by another
		//eg: switched docs
		if (!atom.workspace.isTextEditor(item)) {
   		 	return;
 		}

		if(this.docActive){
			if(this.docActive.textEditor == item){
				return;
			}
		}

		var doc = this.docGetFromEditor(item);
		if(!doc) return;

		this.docSetActive(doc);

		this.eventInvalidateSymbols();
	},
	openFilesInitialize: function(){

		this.openFilesList = [];

		this.openFilesModal;
		let panel;
		this.openFilesView = new exwSelectList({
			title:'Files currently open...',
			titleIcon: 'icon-file-text',
			selectMultiple: true,
			didConfirmSelection: (selected) => {
				console.log('selected items %o', selected);
				let item = selected[0];
				let path = item.getAttribute('data-file-path');
				console.log('confirmed %o', item);
				console.log('file-path=%s', path);
				this.openFilesModal.hide();

				atom.workspace.open(path);
			},
			didCancelSelection: () => {
				console.log('cancelled');
				this.openFilesModal.hide();
			}

		});

		console.log(this.openFilesView);


		this.openFilesModal = atom.workspace.addModalPanel({
			item: this.openFilesView.element,
			visible: false
		});
	},
	openFilesToggle: function(){
		if( this.openFilesModal.isVisible() ){
			this.openFilesModal.hide();
			return;
		}

		var listItems = [];

		let panes = atom.workspace.getCenter().getPanes();
		for(let pane of panes){
			let items = pane.getItems();
			for(let item of items){
				if (!atom.workspace.isTextEditor(item)) continue;
				if(item.getTitle() == "untitled") continue;

				let e = {
					primaryLine: item.getTitle(),
					secondaryLine: item.getPath(),
					icon: 'icon-file-text',
					data: {'file-path': item.getPath() }
				};
				listItems.push(e);
			}
		}

		this.openFilesView.setItems(listItems);

		this.openFilesModal.show()
		this.openFilesView.focusFilterEditor();

	},
	projectHydrate: function(){

	},
	projectHydrateTools: function(){

		this.lists.tools.append(new exwListTree({
			type: "tool", caption: 'List open files...', icon: 'icon-file-directory',
			isRoot: false,
			isFolder: false,
			isExpanded: false,
			attr: {alt: 'Show open files...', id: 'exw-ide-tool-cmd-open-filed', 'class': ['exw-ide-tool']},
			data: { uid: 'cmd-open-files' },
			onAction: (listItem, event) => {
				this.openFilesToggle();
			},
		}));

		this.lists.tools.append(new exwListTree({
			type: "tool", caption: 'Open project...', icon: 'icon-briefcase',
			isRoot: false,
			isFolder: false,
			isExpanded: false,
			attr: {alt: 'Open project...', id: 'exw-ide-tool-cmd-open-prj', 'class': ['exw-ide-tool']},
			data: { uid: 'cmd-open-prj' },
			onAction: (listItem, event) => {
				this.prjOpenProjectToggle();
			},
		}));

		this.lists.tools.append(new exwListTree({
			type: "tool", caption: 'PHP Functions...', icon: 'icon-rocket',
			isRoot: false,
			isFolder: false,
			isExpanded: false,
			attr: {alt: 'PHP Functions...', id: 'exw-ide-tool-cmd-fn-php', 'class': ['exw-ide-tool']},
			data: { uid: 'cmd-open-php-fn' },
			onAction: (listItem, event) => {
				this.ideShowFNDocs('php');
			},
		}));

		for(tool of this.ideUserTools.tools){
			var def = {
				type: "tool", caption: s, icon: 'icon-tools',
				isRoot: false,
				isFolder: false,
				isExpanded: false,
				attr: {id: 'exw-ide-tool-' + uid, 'class': ['exw-ide-tool']},
				data: { uid: uid },
				onAction: (listItem, event) => {
					exwIDE.ideRunToolWithUID(listItem.data.uid);
				},
			};

			var listEntry = new exwListTree(def);
			this.lists.tools.append(listEntry);
		}

		this.lists.tools.refresh();
	},

	ideRunToolWithUID: function(uid, hook){
		if(!this.ideUserTools) return;
		if(!this.ideUserTools.tools.hasOwnProperty(uid)) return;
		var tool = this.ideUserTools.tools[uid];

		if(!hook)  hook = 'onAction';

		console.log("RUNNING TOOL %s WITH HOOK %s", uid, hook);

		var src = tool.jscode;
		src += "\ntool." + hook + "();\n";

		var ctx = this.ideGetScriptDefaultContext();
		this.ideRunScript(src, ctx, tool.__source_file);

	},
	ideAddTool: function(file){
		if(!this.ideUserTools) return;

		if(!file) return;
		if(!file.isFile()) return;

		var exwIDE = this;

		const pathTool = file.getPath();
		const fileName = file.getBaseName();
		const ext = fileName.substr(fileName.lastIndexOf('.') + 1);
		if(ext != "js") return;

		console.log("Loading Tool %s", pathTool);

		var uid = replaceAll(replaceAll(fileName.replace('.js',''),' ','-'),'_','-').toLowerCase();

		if(this.ideUserTools.tools.hasOwnProperty(uid)){
			let suid = uid;
			var i = 1;
			uid = suid + '-' + i.toString();
			while(this.ideUserTools.tools.hasOwnProperty(uid)){
				i++;
				uid = suid + '-' + i.toString();
			}
		}


		let buildToolEntry = (tool) => {

			let s = tool.title ? tool.title : uid;
			var ideTool = {
				__uid: uid, __title: s, __source_path: pathTool, __source_file: fileName,
				srcAction: '',
			};

			var src = "var tool = {\n";
			if(tool.onAction && (typeof(tool.onAction) == 'function')){
				src += 'onAction:' + tool.onAction.toString() + ",\n";
			}else{
				src += "onAction: function(){},\n";
			}

			if(tool.onSave && (typeof(tool.onSave) == 'function')){
				this.ideUserTools.hooks.onSave.push(uid);
				src += 'onSave:' + tool.onSave.toString() + ",\n";
			}

			src += "\n};\n";

			ideTool.jscode = src;

			//console.log('Adding Tool %o', ideTool);
			this.ideUserTools.tools[uid] = ideTool;



			let cmd_uid = 'ide-project:tool-' + uid;
			let cmdDef = {};
			cmdDef[cmd_uid] = (event) => {
				console.log('command event %o', event);
				exwIDE.ideRunToolWithUID(uid);
			};

			exwIDE.disposables.add(atom.commands.add('atom-workspace', cmdDef));

			if(tool.isTextEditorContextMenu){
				let mnuDef = {label: ideTool.__title, command: cmd_uid};
				var mnu = atom.contextMenu.add({"atom-text-editor":[mnuDef]});
			}
		};

		file.read().then(function(code){
			var ctx = exwIDE.ideGetScriptDefaultContext();
			ctx.tool = undefined;

			exwIDE.ideRunScript(code, ctx, fileName);

			if(!ctx.tool || typeof(ctx.tool) != 'object' ) return;
			buildToolEntry(ctx.tool);
		});
	},
	ideGetScriptDefaultContext: function(){
		const path = require('path');
		const fs = require('fs');

		let doc = this.docActive;
		let editor = (doc) ? doc.textEditor : null;
		let exwIDE = this;

		let ctx = {};
		ctx.atom = atom;
		ctx.fs = fs;
		ctx.path = path;
		ctx.console = console;
		ctx.ide = {
			getDocument: () => {
				if(!doc) return null;
				return doc;
			},
			getTextEditor: () => {
				if(!doc) return null;
				return editor;
			},
			config: {
				set: (k, v) => {
					if(!exwIDE.ideConfigStore) return;
					ide.config.set(k, v);
					console.log('config.set(%s) = %s', k, v);
				},
				get: (k) => {
					if(!exwIDE.ideConfigStore) return undefined;
					if(ide.config.data.hasOwnProperty(k)){
						return ide.config.data[k];
					}
					return undefined;
				},
				save: () => {
					if(!exwIDE.ideConfigStore) return;
					ide.config.save();
				},
			},
			spawn: function (cmd, args, options){
				//https://nodejs.org/api/child_process.html
				const { spawn } = require('child_process');
				const p = spawn(cmd, args, options);

				return new Promise(function(resolve, reject){
					var std="",stderr="", code=0;
					p.stdout.on('data', (data) => {
	  					std += data;
					});
					p.stderr.on('data', (data) => {
	  					stderr += data;
					});

					p.on('close', (code) => {
						resolve({code:code, "stdout": std, "stderr": stderr});
					});
				});
			},
			exec: function(cmd, options){
				//https://nodejs.org/api/child_process.html
				const { exec } = require('child_process');
				const p = exec(cmd, options);

				return new Promise(function(resolve, reject){
					var std="",stderr="", code=0;
					p.stdout.on('data', (data) => {
	  					std += data;
					});
					p.stderr.on('data', (data) => {
	  					stderr += data;
					});
					p.on('close', (code) => {
						resolve({code:code, "stdout": std, "stderr": stderr});
					});
				});
			},
		};
		ctx.ide.editor = {
			getLanguage: () => {
				if(!doc) return '';
				var src = editor.getText();
				return editor.getGrammar().id;
			},
			getLength: () => {
				if(!doc) return 0;
				let src = '' + editor.getText();
				return src.length;
			},
			getValue: () => {
				if(!doc) return '';
				let src = '' + editor.getText();
				return src;
			},
			setValue: (s) => {
				if(!doc) return;
				editor.setText(s);
			},
			insertText: (s, selected) => {
				if(!doc) return;
				let ops = {
					select: (selected ? true: false)
				};

				editor.insertText(s, ops);
			},
			getSelection: () => {
				if(!doc) return '';
				return editor.getSelectedText();
			},
			getTitle: () => {
				if(!doc) return '';
				return editor.getTitle();
			},
			getPath: () => {
				if(!doc) return '';
				return editor.getPath();
			},
			getFileName: () => {
				if(!doc) return '';
				return editor.getFileName() || 'untitled';
			}
		};

		return ctx;
	},
	ideRunScript: function(src, ctx, fileRef){

		if(!fileRef) fileRef = 'exwide_tool_script.vm';
		const vm = require('vm');

		if(ide.config){
			ide.config.read();
		}

		try {
			vm.createContext(ctx);
			vm.runInContext(src, ctx, fileRef);
		}catch(ex){
			let msg = 'EXW IDE Error running tool script! [ERR570]';
			console.error(msg);
			console.error(ex.stack);

			ide.displayError(msg, ex.stack);
		}

		if(ide.config){
			ide.config.save();
		}
	},

	docSetActive: function(doc){
		if(!doc){
			if(this.docSubscriptions) this.docSubscriptions.dispose();
			this.docActive = null;
			this.eventNoActiveDoc();
		}

		console.log("Active Doc is %o", doc);
		this.docActive = doc;
		this.eventActiveDocChanged();
	},
	docGetFromEditor: function(textEditor){
		var docFound = null;
		for(let doc of this.documents){
			if(doc && doc.textEditor && doc.textEditor == textEditor){
				docFound = doc;
				break;
			}
		}
		return docFound;
	},
	docRemove: function(aDoc){
		//removes a doc from set
		if(aDoc == this.docActive){
			this.docSetActive(null);
		}

		let idx = this.documents.indexOf(aDoc);

		if (idx !== -1){
			this.documents.splice(idx, 1);
			return aDoc;
		}

		return null;
	},
	docCreate: function(textEditor){
		let exwIDE = this;

		var doc = {
			id: textEditor.id,
			lastPosition: {row: 0, column: 0},
			textEditor: textEditor,
			destory: function(){
				this.deactivate();
				if(this.markerLayer) this.markerLayer.destroy();
			},
			deactivate: function() {
    			if(this.decorationLayer) this.decorationLayer.destroy();
				if(this.disposables) this.disposables.dispose();
			},
			position: function(){
				return this.textEditor.getLastCursor().getBufferPosition();
			}
		};



		doc.disposables = new CompositeDisposable();
		doc.markerLayer = textEditor.addMarkerLayer({persistent: true});
		doc.decorationLayer = textEditor.decorateMarkerLayer(doc.markerLayer, {type: 'line-number', class: 'bookmarked'});

		doc.title = textEditor.getTitle();

		let editor = textEditor;

		doc.disposables.add(atom.commands.add(atom.views.getView(textEditor), {
			'ide-project:toggle-bookmark': () => exwIDE.bmToggle(),
			'ide-project:jump-to-next-bookmark': () => exwIDE.bmJumpToNext(),
			//'bookmarks:jump-to-previous-bookmark': this.jumpToPreviousBookmark.bind(this),
			//'bookmarks:select-to-next-bookmark': this.selectToNextBookmark.bind(this),
			//'bookmarks:select-to-previous-bookmark': this.selectToPreviousBookmark.bind(this),
			//'bookmarks:clear-bookmarks': this.clearBookmarks.bind(this)
		}));

		doc.disposables.add(textEditor.observeSelections(selection => {
			console.log("selection observeSelections");
			console.log('doc %o', doc);
			if(doc != exwIDE.docActive) return;


			exwIDE.eventActiveDocSelectionChanged();


		}));
		doc.disposables.add(textEditor.onDidSave(path => {
			console.log("doc onDidSave %s", path);
			console.log('doc %o', doc);
			if(doc != exwIDE.docActive) return;
			//if(textEditor.isModified()) return;

			exwIDE.eventActiveDocSaved(path);

		}));

		doc.disposables.add(textEditor.onDidChangeCursorPosition(e => {
			if(doc != exwIDE.docActive) return;
			let p = doc.position();

			exwIDE.eventActiveDocCursorPositionChanged(p);
			doc.lastPosition.row = p.row;
			doc.lastPosition.column = p.column;

		}));

		return doc;
	},
	bmToggle: function(){
		if(!this.docActive) return;
		let exwIDE = this;
		let doc = this.docActive;
		let editor = this.docActive.textEditor;

		for (const range of doc.textEditor.getSelectedBufferRanges()) {
			const bookmarks = doc.markerLayer.findMarkers({intersectsRowRange: [range.start.row, range.end.row]});
			if (bookmarks && bookmarks.length > 0) {
				for (const bookmark of bookmarks) {
					bookmark.destroy()
				}

			} else {
	        	const bookmark = doc.markerLayer.markBufferRange(range, {invalidate: 'surround', exclusive: true});
				doc.disposables.add(bookmark.onDidChange(({isValid}) => {
	          		if (!isValid) {
	            		bookmark.destroy();
	          		}
					exwIDE.eventBookmarksChanged();
	        	}));
	      	}
	    }//end for

		exwIDE.eventBookmarksChanged();
	},
	bmJumpToNext () {
		if(!this.docActive) return;
		let doc = this.docActive;
		let editor = this.docActive.textEditor;

	    if (doc.markerLayer.getMarkerCount() > 0) {
			const bufferRow = editor.getLastCursor().getMarker().getStartBufferPosition().row;
			const markers = doc.markerLayer.getMarkers().sort((a, b) => a.compare(b));
			const bookmarkMarker = markers.find((marker) => marker.getBufferRange().start.row > bufferRow) || markers[0];
			editor.setSelectedBufferRange(bookmarkMarker.getBufferRange(), {autoscroll: false})
			editor.scrollToCursorPosition()
	    } else {
			atom.beep()
	    }
  	},
	bmPopulateList(){
		if(!this.docActive) return;

		if(!this.lists.bm.disposables){
			this.lists.bm.disposables = new CompositeDisposable();
		}else{
			this.lists.bm.disposables.dispose();
		}

		this.lists.bm.clear();

		let doc = this.docActive;
		let editor = this.docActive.textEditor;

		var rowNode = this.bmPanel;
		var view = this;


		for (const marker of doc.markerLayer.getMarkers()) {
			let text = `${marker.getStartBufferPosition().row}`;
			const lnText = editor.lineTextForBufferRow(marker.getStartBufferPosition().row);
			const bmStartRow = marker.getStartBufferPosition().row
	   		const bmEndRow = marker.getEndBufferPosition().row

			console.log("BM @LN:%d TEXT=%s",bmStartRow, lnText);

			const s = 'Ln: ' +  `${bmStartRow + 1}`;


			var def = {
				type: "sym-marker", caption: s, icon: 'exw-icn-bm',
				isRoot: false,
				isFolder: false,
				isExpanded: false,
				data: { row: bmStartRow },
				onAction: (listItem, event) => {
					this.eventSymItemClicked(listItem);
				},
				decorate: (element, labelNode) => {
					this.lists.bm.disposables.add(atom.tooltips.add(labelNode, {title:'Line: ' + lnText, placement: 'auto right'}));
				}
			};


			var listEntry = new exwListTree(def);
			this.lists.bm.append(listEntry);
		}

		this.lists.bm.refresh();
	},

	symBuildState: function(doc){
		if(!doc) return;
		if(!doc.textEditor) return;

		var src = doc.textEditor.getText();
		var grammerId = doc.textEditor.getGrammar().id;
		console.log('GRAMMER IS:%s', grammerId);


		doc.symState = exwSymbolParser.parse(grammerId, src);
		this.symPopulateList();
		this.lists.sym.refresh();
	},
	symPopulateList: function(){
		if(!this.docActive) return;

		if(!this.lists.sym.disposables){
			this.lists.sym.disposables = new CompositeDisposable();
		}else{
			this.lists.sym.disposables.dispose();
		}

		this.lists.sym.clear();
		if(!this.docActive.symState) return;

		let createItems = (parent, items, filter) => {

			for(let sym of items){
				var flgNoChilds = false;
				if(sym.ignore) continue;
				if(filter.text){
					flgNoChilds = true;
					if(sym.title.toLowerCase().indexOf(filter.text.toLowerCase()) < 0 ) continue;
				}
				var def = {
					type: sym.symType, caption: sym.title, icon: sym.icon,
					isRoot: false,
					isFolder: (sym.items.length > 0),
					isExpanded: (sym.items.length > 0),
					data: { row: sym.point.row },
					onAction: (listItem, event) => {
						this.eventSymItemClicked(listItem);
					},
				};


				if(sym.parent){
					def.data.parentType = sym.parent.symType;
					def.data.parentCaption = sym.parent.title;
					def.data.parentIcon = sym.parent.icon;
				}

				if(sym.attr) def.attr = sym.attr;

				var listEntry = new exwListTree(def);

				if(!flgNoChilds && sym.items.length > 0){
					createItems(listEntry, sym.items, filter);
				}

				parent.append(listEntry);
			}
		};
		createItems(this.lists.sym, this.docActive.symState.items, {});
		this.lists.sym.refresh();
	},
	symSelectCloseToRow: function(row){

		let found = this.lists.sym.filter((item) => {
			if(!item || !item.data || !item.data.hasOwnProperty('row')) return false;
			return (item.data.row <= row);
		});


		var itemToSelect;
		if(found.length <= 0) return;

		itemToSelect = found.slice(-1)[0];

		if(itemToSelect){
			this.lists.sym.select(itemToSelect);
		}else{
			this.lists.sym.select();
		}
	},
	symShowView: function(){
		if(this.symView) this.symView.show();
	},

	prjInitialize: function(){

		this.prjStore = undefined;

		let pathUserData = atom.getConfigDirPath();
		let pathUserProjects = path.join(pathUserData, 'exc_project.js');


		this.prjStore = new exwFileStore({path: pathUserProjects, isJSON: true, defaults:{}});

		this.prjSaveView = exwAtom.createDialog({
			name: 'save-prj',
			title: 'Save Project',
			titleIcon: 'package',
			btnOk: {caption: 'Save', icon: 'icon-check'},
			didConfirm: (dlg) =>{
				if(!dlg.data) return;

				dlg.data.name = dlg.$("#fld-prj-name").value;
				dlg.data.icon = dlg.$("#fld-prj-icon").value;
				dlg.data.devMode = dlg.$("#fld-dev-mode").checked;


				this.prjSave(dlg.data);
			},
			didShowDialog: (dlg)=> {
				if(!dlg.data) return;

				dlg.$("#fld-prj-name").value = dlg.data.name;
				dlg.$("#fld-prj-icon").value = dlg.data.icon;
				dlg.$("#fld-dev-mode").checked = dlg.data.devMode;
				dlg.$("#lbl-uid").textContent = dlg.data.uid;

				let s = '';
				for(let p of dlg.data.paths){
					s += p + '<br>';
				}
				s = s.replace(/\s/g, '&nbsp;');
				dlg.$("#lbl-paths").innerHTML = s;


			},
			contentsModified: (dlg) => {

			}
		});

		this.prjSaveView.setContents((dlg)=>{
			let s = '<h1 class="block section-heading">Save Project</h1><div class="block"><label class="input-label">Name</label><input id="fld-prj-name" autofocus="" type="text" class="input-text exw-textbox" tabindex="0"></div><div class="block"><label class="input-label">Icon</label><input id="fld-prj-icon" type="text" class="input-text exw-textbox" tabindex="2"></div><div class="block"><label class="input-label">Development mode</label><input id="fld-dev-mode" type="checkbox" class="input-toggle" tabindex="4"></div><div class="block" style="padding: 6px 6px;"><b>Paths:</b><br><span id="lbl-paths"></span><br><br><b>ID: </b><span id="lbl-uid"></span></div>';
			return s;
		});



		this.prjOpenView = new exwSelectList({
			title:'Open a project...',
			titleIcon: 'icon-file-directory',
			selectMultiple: false,
			didConfirmSelection: (selected) => {
				console.log('selected items %o', selected);
				let item = selected[0];
				let uid = item.getAttribute('data-prj-uid');
				console.log('confirmed %o', item);
				console.log('prj-uid=%s', path);
				this.prjOpenModal.hide();

				data = this.prjStore.get(uid);
				if(!data) return;
				atom.open({
      				devMode: data.devMode,
      				pathsToOpen: data.paths,
    			});
			},
			didCancelSelection: () => {
				console.log('cancelled');
				this.prjOpenModal.hide();
			}

		});


		this.prjOpenModal = atom.workspace.addModalPanel({
			item: this.prjOpenView.element,
			visible: false
		});

	},
	prjOpenProjectToggle: function(){
		if( this.prjOpenModal.isVisible() ){
			this.prjOpenModal.hide();
			return;
		}

		this.prjStore.read();

		var listItems = [];

		let keys = Object.keys(this.prjStore.data);
		for(let uid of keys){
			let data = this.prjStore.data[uid];
			let s = '';
			for(let p of data.paths){
				s += p + '<br>';
			}
			s = s.replace(/\s/g, '&nbsp;');

			let e = {
				primaryLine: data.name,
				secondaryLine: s,
				icon: data.icon,
				data: {'prj-uid': data.uid }
			};
			listItems.push(e);
		}

		this.prjOpenView.setItems(listItems);

		this.prjOpenModal.show()
		this.prjOpenView.focusFilterEditor();

	},
	eventProjecSaved: function(data){

	},
	prjSaveCurrent: function(){
		let paths = atom.project.getPaths();
		let uid = atom.getStateKey(paths);

		if (!uid) return;

		let prjData = this.prjStore.get(uid);

		if(!prjData){
			prjData = {name: 'My Project', uid: uid, icon: 'icon-briefcase', paths: paths, devMode: false};

			if(paths.length){
				let file = new Directory(paths[0]);
				prjData.name = file.getBaseName();
			}
		}

		let form = this.prjSaveView;
		form.setData(prjData);
		form.show();
	},
	prjSave: function(prjData){
		console.log(prjData);

		this.prjStore.set(prjData.uid, prjData);
		this.prjStore.save();

		let state = atom.serialize({isUnloading: true});
		atom.stateStore.save(prjData.uid, state);

		this.eventProjecSaved(prjData);
	},
	phpInitialize: function(){

		let lang = {
			uid:'php',
			name:'PHP',
			grammers:['text.html.php', 'source.php'],
			fnIndex: {}
		};

		let pathPHPFunctionInfo = path.join(this.packagePath,'config', 'php_functions_en.txt');

		let phpData = fs.readFileSync(pathPHPFunctionInfo, 'utf8').split(/\n/g);

		let k = '';
		for(let i = 0; i< phpData.length; i++){
			let sd = phpData[i].split(/\%/g);
			let fn = sd[0].toLowerCase();

			k = fn.charAt(0);
			if(!lang.fnIndex[k]) lang.fnIndex[k] = {keys:[],entries:{}};
			let index = lang.fnIndex[k];

			if(index.keys.indexOf(fn) >= 0) continue;
			index.keys.push(fn);
			index.entries[fn] = {key:fn,sig:sd[1], desc:sd[2]};

		}
		this.langs[lang.uid] = lang;
		console.log(lang);

		this.ideCreateFNDocs();


	},
	ideShowFNDocs: function(langUID){
		if(!this.langFNDocsView) return;
		if(!this.langs[langUID]) return;

		this.langFNDocsView.setData({uid: langUID});
		this.langFNDocsView.setTitle(this.langs[langUID].name + ' Functions', 'icon-file-code');
		this.langFNDocsView.show();

	},
	ideCreateFNDocs: function(){
		this.langFNDocsView = exwAtom.createDialog({
			name: 'ide-func-doc',
			title: 'Functions',
			titleIcon: 'package',
			btnOk: false,
			btnCancel: {cpation: 'Done'},
			didConfirm: (dlg) =>{

			},
			didShowDialog: (dlg)=> {
				if(!dlg.data) return;

			},
			contentsModified: (dlg) => {

			}
		});

		let div, txt, nlist, nInfo, nSyntax, nDesc;

		div = document.createElement('div');
		div.innerHTML = '<input id="lang-search-txt" class="exw-textbox-search input-search exw-textbox" type="search" placeholder="Search" tabindex="-1">' +
		'<div class="exw-error-message" style="display: none;"><span class="exw-error-text"></span></div>' +
		'<div class="lang-fn-ref" style="display: none; margin-top: 10px;">' +
		'<div class="lang-fn-syntax" style="font-family: monospace;"></div><div class="lang-fn-description" style=""></div>' +
		'<div style="margin-top: 6px; text-align: right;"><button class="btn btn-xs btn-primary icon icon-clippy" id="lng-cmd-copy" title="Copy"> Copy</button></div></div>' +
		'<div class="lng-fn-list" style="margin-top: 10px; max-height: 300px; overflow: auto;"><ul class="lang-fn-matches list-group" ><li class="list-item text-info"><span>Start typing to search...</span></li></ul></div>';



		this.langFNDocsView.setContents(div);

		txt = div.querySelector('#lang-search-txt');
		nlist = div.querySelector('.lang-fn-matches');
		nInfo = div.querySelector('.lang-fn-ref');
		nSyntax = nInfo.querySelector('.lang-fn-syntax');
		nDesc = nInfo.querySelector('.lang-fn-description');

		let findFunctions = (s, dlg) => {
			console.log('Searching for %s',s);
			let uid = dlg.data.uid;
			let lang = this.langs[uid];

			s = s.toLowerCase();
			let k = s.charAt(0);

			if(!lang.fnIndex[k]){
				nlist.innerHTML = '<li class="list-item text-warning"><span>No functions found...</span></li>';

				nInfo.style.display = 'none';
				return;
			}

			nlist.innerHTML = '';

			let index = lang.fnIndex[k];

			let matches = index.keys.filter((fn) => {
				if(!fn) return false;
				return (fn.indexOf(s)===0);
			});

			console.log(matches);
			if(matches.length == 0){
				nlist.innerHTML = '<li class="list-item text-warning"><span>No functions found...</span></li>';
			}else{
				for(let fn of matches){
					let e = index.entries[fn];

					let row = document.createElement('li');
					row.classList.add('list-item', 'lang-fn-result');
					row.innerHTML = "<span class='icon icon-rocket' data-lang='" + uid + "' data-index='" + k + "' data-fn='" + fn + "' style=''>" + fn + "</span>";
					nlist.appendChild(row);
				}
			}
		};

		let searching = false;
		txt.addEventListener('input', (event) => {
			event.preventDefault();
			event.stopImmediatePropagation();
			if(searching) return;
			searching = true;
			findFunctions(txt.value, this.langFNDocsView);
			searching = false;
		});

		nInfo.querySelector('#lng-cmd-copy').addEventListener('click', (event) => {
			atom.clipboard.write(nSyntax.textContent);
			this.langFNDocsView.hide();
		});

		nlist.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopImmediatePropagation();
			if(searching) return;

			console.log(event.target);

			let o = event.target;
			let uid = o.getAttribute('data-lang');
			let k = o.getAttribute('data-index');
			let fn = o.getAttribute('data-fn');

			if(!fn) return;

			let lang = this.langs[uid];
			if(!lang.fnIndex[k]){
				nInfo.style.display = 'none';
				return;
			}

			let index = lang.fnIndex[k];
			let e = index.entries[fn];


			nSyntax.textContent = e.sig;
			nDesc.textContent = e.desc;
			nInfo.style.display = 'block';


		});
	}
};
