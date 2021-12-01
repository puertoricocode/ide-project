'use babel';

/*
Jose L Cuevas
https://exponentialworks.com
*/

import {exwAtom}  from './exwAtomHelper.js';


import exwFileStore from './exwFileStore.js';
import exwSelectList from './exwSelectList.js';
import projectPanelView  from './ide-project-view.js';
import exwTerminalView  from './ide-terminal-view.js';

import { CompositeDisposable, Disposable, TextEditor, File, Directory, Emitter } from 'atom';

const { ide, dialogManager } = require('./exwIDE.js');
const documentManager = require('./exwDocuments.js');
const panelManager = require('./exwPanelView.js');


const project = require('./exwProjectController.js');
const commando = require('./exwCommando.js');


//modules

const path = require('path');
const fs = require('fs');

const { app } = require('electron');
//console.log('app %o', app);

console.log("[EXW-IDE] Loading");

//console.log('userData=%s', app.getPath('userData'));

function replaceAll(string, search, replace) {
  return string.split(search).join(replace);
}


var exwController = {
	ide: ide,
	treeView: null,
	documentManager: documentManager
};

module.exports = exwController;


ide.controller = exwController;
ide.project = project;
ide.documentManager = documentManager;
ide.commando = commando;


import moduleTools from './exwModuleTools.js';
ide.modules[ moduleTools.name ] = moduleTools;

import moduleOpenFiles from './exwModuleOpenFiles.js';
ide.modules[ moduleOpenFiles.name ] = moduleOpenFiles;

import moduleACPHP from './exwModuleAutocompletePHP.js';
ide.modules[ moduleACPHP.name ] = moduleACPHP;


atom.themes.requireStylesheet( ide.getPathForPackage('../styles/exw-select-list.less') );
atom.themes.requireStylesheet( ide.getPathForPackage('../styles/exw-command-terminal.less') );


var initializeIDE = function(){
	console.log("[EXW-IDE] onDidLoadInitialPackages");
	console.log("DIR %s", __dirname);

	//get handle of Atom's TreeView
	ide.ui.treeView.attachToModule();

	documentManager.activate();

	for(const moduleName of Object.keys(ide.modules)){
		console.log("[EXW-IDE] Loading module \"%s\"", moduleName);
		let module = ide.modules[moduleName];

		module.initialize(ide);
	}

	//general commands

	ide.addCommand('exw-ide:edit-config-file', 'Edit config', () => {
		atom.workspace.open(ide.config.path);
	});


};

ide.disposables.add( atom.packages.onDidActivateInitialPackages( initializeIDE ) );

//#MARK OPENFILES
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
		didDblClickSelection: (selected) => {
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
	console.log('[EXW-IDE] ide-project was toggled!');

	ide.disposables.add(atom.workspace.addOpener(function(uri){
		if(uri == 'atom://exw-ide-prjview'){
			console.log('[EXW-IDE] Opener invoked project.getPanelView()');
			return project.getPanelView();
		}
	}));

	ide.disposables.add(atom.workspace.addOpener(function(uri){
		if(uri == 'atom://exw-ide-commando'){
			console.log('[EXW-IDE] Opener invoked commando.getPanelView');
			return commando.getPanelView();
		}
	}));

	//#MARK Bootload the IDE
	project.activate();

	commando.activate()

	//ide.dispatchCommand('exw-ide:show-explorer');
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
exwController.consumeSignal = function(api){
	ide.busySignal = api;
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
