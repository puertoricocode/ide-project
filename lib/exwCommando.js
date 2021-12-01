/*
Jose L Cuevas
https://exponentialworks.com
*/


const { CompositeDisposable, Disposable, TextEditor, File, Directory, Emmiter } = require('atom');

const { ide, dialogManager } = require('./exwIDE.js');
const _atom = require('./exwAtomHelper.js');
const documentManager = require('./exwDocuments.js');
const panelManager = require('./exwPanelView.js');
const exwListTree = require('./exwListTree.js');
const exwSelectList = require('./exwSelectList.js');
const dom = require('./exwDOMHelper.js');
const exwCommandTerminal = require('./exwCommandTerminal.js');

//modules
const _electron = require("electron");
const path = require('path');
const fs = require('fs');

exwCommando = {};
let view, term;
module.exports = exwCommando;

function replaceAll(string, search, replace) {
  return string.split(search).join(replace);
}



function terminalBuildView(){

	exwCommando.view = panelManager.create({
		name: 'commando',
		icon: 'browser',
		title:'Commando',
		deserializer: 'commandoPanelRestore',
		defaultLocation: 'bottom',
		allowedLocation: ['bottom', 'center'],
		onDidShow: function(view){
			ide.emitter.emit('commando-visible', term, view);
			exwCommando.isVisible = true;
			term.focus();
		},
		onDidClose: function(view){
			exwCommando.isVisible = false;
		},

	});

	view = exwCommando.view; //save in global


	view.element.innerHTML = "<div id='exw-terminal-wrapper'></div>";

	exwCommando.term = new exwCommandTerminal({
		name: 'IDE',
		commandPreflight: function(term, cmd){
				return true;
		},
	});
	term = exwCommando.term;

	view.element.querySelector('#exw-terminal-wrapper').appendChild(term.getElement());
	term.setStatusText('Waiting for IDE...');

	ide.emitter.emit('commando-ready', term, view);
	
}


function terminalActivate(){
	//#MARK COMMAND exw-ide:show-panel
	ide.addCommand('exw-ide:show-commando', 'Show Commando', () => {
		atom.workspace.open('atom://exw-ide-commando');
	});
}

exwCommando.activate = function(){
	terminalActivate();
}
exwCommando.getPanelView = function(){
	if(!this.view){
		terminalBuildView();
	}
	return this.view;
};
exwCommando.restorePanelView = function(state){
	return this.getPanelView(state);
};
