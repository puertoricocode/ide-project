/*
Jose L Cuevas
https://exponentialworks.com
*/

console.log('@exwDocuments');

const { CompositeDisposable, Disposable, TextEditor, File, Directory, Emmiter } = require('atom');

const { ide, dialogManager } = require('./exwIDE.js');
const _atom = require('./exwAtomHelper.js');
const documentManager = require('./exwDocuments.js');
const panelManager = require('./exwPanelView.js');
const parser = require('./exwSymbolParser.js');
const exwListTree = require('./exwListTree.js');

//modules
const _electron = require("electron");
const path = require('path');
const fs = require('fs');


var exwBookmarkManager = {
	


};

function updateBookmarksTree(){

}
function bookmarksActivate(){


	symbolsCreateDialog();

	documentManager.onDidDocumentGetTextEditor((doc) => {
		if(!doc.textEditor) return;
	});

	documentManager.onDidChangeDocumentGrammar((doc) => {
		updateSymbolsForDocument(doc);
		if(exwProject.symbolsDocumentID == doc.id){
			updateSymbolsTreeForDocument(doc);
		}
	});
	documentManager.onDidSaveDocument((doc) => {
		updateSymbolsForDocument(doc);
		if(exwProject.symbolsDocumentID == doc.id){
			updateSymbolsTreeForDocument(doc);
		}
	});
	documentManager.onDidChangeDocumentCursor((doc) => {
		//updateSymbolsForDocument(doc);
	});
	documentManager.onDidChangeActiveDocument((doc) => {
		if(!doc) return;
		if(!doc.symState){
			updateSymbolsForDocument(doc);
		}

		updateSymbolsTreeForDocument(doc);
	});

	ide.addCommand('exw-ide:show-symbols', 'Show Symbols', () => {
		if(!documentManager.getActive()) return;
		if(!documentManager.activeDoc.symState){
			updateSymbolsForDocument(documentManager.activeDoc);
		}
		exwProject.symbolsView.show();
	});
}

module.exports = exwBookmarkManager;
