/*
Jose L Cuevas
https://exponentialworks.com
*/

console.log('@exwDocuments');

const { CompositeDisposable, Disposable, TextEditor, File, Directory, Emmiter } = require('atom');

const { ide, dialogManager } = require('./exwIDE.js');
const _atom = require('./exwAtomHelper.js');

//modules
const _electron = require("electron");
const path = require('path');
const fs = require('fs');


const watchedEditors = new WeakSet();
let activeDoc = null;

var exwDocumentManager  = {
	items: new Map(),

};


let exwDocument = {
	id: null,
	path:'',
	fileName: '',
	title: '',
	grammer:'',
	lastPosition: {row: 0, column: 0},
	textEditor: null,
	markerLayer: null,
	decorationLayer: null,
	destory: function(){
		this.deactivate();
		if(this.markerLayer) this.markerLayer.destroy();
	},
	deactivate: function() {
		if(this.decorationLayer) this.decorationLayer.destroy();
		if(this.disposables) this.disposables.dispose();
	},
	close: function(){
		let pane = this.getPane();
		if(pane){
			pane.destroyItem(this.textEditor);
		}
	},
	getPane: function(){
		let panes = atom.workspace.getCenter().getPanes();
		for(let pane of panes){
			let items = pane.getItems();
			for(let item of items){
				if (!atom.workspace.isTextEditor(item)) continue;
				if(item.id === this.id) return pane;
			}
		}
		return undefined;
	},
	position: function(){
		return this.textEditor.getLastCursor().getBufferPosition();
	},
	isActive: function(){
		if(!activeDoc) return false;
		return (this.id == activeDoc.id);
	},
	gotoLine: function(line){
		if(!this.textEditor) return;
		this.textEditor.scrollToBufferPosition([line, 1]);
		this.textEditor.setCursorBufferPosition([line, 1]);
		this.textEditor.moveToFirstCharacterOfLine();
	},
	disposed: false,
	dispose: function(){
		if(this.disposed) rteurn;
		this.disposed = true;
	},
};

function docFactory(){
	let doc = Object.create(exwDocument);

	doc.disposables = new CompositeDisposable();
	return doc;
}

function docInitWithTextEditor(aDoc, textEditor){
	let doc = aDoc;
	let editor = textEditor;

	doc.textEditor = null;
	if(!textEditor) return doc;

	doc.id = textEditor.id;
	doc.textEditor = textEditor;
	doc.title = textEditor.getTitle();

	doc.markerLayer = textEditor.addMarkerLayer({persistent: true});
	doc.decorationLayer = textEditor.decorateMarkerLayer(doc.markerLayer, {type: 'line-number', class: 'bookmarked'});


	doc.path = (textEditor.getPath() || "");
	doc.fileName = path.basename(doc.path);

	let grammer = editor.getGrammar();
	if(grammer) doc.grammer = grammer.id;

	//#MARK EMITS did-doc-selection-changed
	doc.disposables.add(editor.observeSelections(selection => {

		ide.emitter.emit('did-doc-selection-changed', doc);


	}));

	//#MARK EMITS did-doc-grammer-changed
	doc.disposables.add(editor.onDidChangeGrammar( (grammer) => {
		doc.grammer = grammer.id;

		ide.emitter.emit('did-doc-grammer-changed', doc);
	}));

	//#MARK EMITS did-doc-saved
	doc.disposables.add(editor.onDidSave(fpath => {
		doc.title = editor.getTitle();

		let filePath;
		if(typeof(fpath) == "string"){

			filePath = fpath;
		}else{
			if(!fpath.path) return;
			filePath = fpath.path;
		}

		doc.path = filePath;
		doc.fileName = path.basename(filePath);

		doc.grammer = editor.getGrammar().id;

		ide.emitter.emit('did-doc-saved', doc);
	}));


	//#MARK EMITS did-doc-line-changed
	//Called when a Cursor is moved
	doc.disposables.add(textEditor.onDidChangeCursorPosition(e => {
		let p = doc.position();

		doc.lastPosition.row = p.row;
		doc.lastPosition.column = p.column;

		ide.emitter.emit('did-doc-line-changed', doc);
	}));

	//#MARK EMITS did-doc-destroy
	ide.disposables.add(textEditor.onDidDestroy(() => {
		ide.emitter.emit('did-doc-destroy', doc);
		exwDocumentManager.items.delete(doc.id);
		doc.dispose();
		watchedEditors.delete(textEditor);
	}));

	return doc;
}

function docFromTextEditor(textEditor){
	let doc = docFactory();
	docInitWithTextEditor(doc,textEditor);

	//console.log('[EXW-IDE] Created doc %o', doc);
	return doc;
}

function docAddFromTextEditor(textEditor){
	let doc = docFromTextEditor(textEditor);
	if(!doc) return null;

	console.log('[EXW-IDE] Added document %s', doc.id);
	exwDocumentManager.items.set(doc.id, doc);

	//#MARK EMITS did-add-doc
	//#MARK EMITS did-doc-get-editor
	ide.emitter.emit('did-add-doc', doc);
	ide.emitter.emit('did-doc-get-editor', doc);



	return doc;
}
function docGetActive(){
	if(!activeDoc){
		let editor = atom.workspace.getActiveTextEditor();
		if(!editor) return null;
		docSetActiveForTextEditor(editor);
	}
	return activeDoc;
}
function docSetActive(doc){
	activeDoc = doc;
	exwDocumentManager.activeDoc = activeDoc;
	if(!activeDoc){
		console.log('[EXW-IDE] Lost active doc');
	}else{
		console.log('[EXW-IDE] Gained active doc %s', activeDoc.id);
	}

	//#MARK EMITS did-change-active-doc
	ide.emitter.emit('did-change-active-doc', activeDoc);
}
function docSetActiveForTextEditor(item){
	if(activeDoc) activeDoc = null;
	if (!atom.workspace.isTextEditor(item)) {
		ide.emitter.emit('did-change-active-text-editor', null);

		return;
	}

	ide.emitter.emit('did-change-active-text-editor', item);

	for(let [id, doc] of exwDocumentManager.items){
		if(doc.textEditor != item) continue;
		activeDoc = doc;
		break;
	}

	docSetActive(activeDoc);

}

function docActivate(){
	//#MARK Setup workspace watcher...
	ide.disposables.add(atom.workspace.observeTextEditors(textEditor => {
		console.log("[EXW-IDE] got texteditor %o", textEditor);
		if (watchedEditors.has(textEditor)) {
			return
		}

		var doc = docAddFromTextEditor(textEditor);
		if(!doc) return;
	}));

	//#MARK EMITS did-change-active-doc
	//#MARK EMITS did-change-active-text-editor
	ide.disposables.add(atom.workspace.getCenter().observeActivePaneItem(item => {
		docSetActiveForTextEditor(item);
	}));


	setTimeout(() => {
		let editor = atom.workspace.getActiveTextEditor();
		if(!editor) return;
		docSetActiveForTextEditor(editor);
	}, 20);


}


//#MARK DOCMANAGER Decorate

exwDocumentManager.getActive = docGetActive


exwDocumentManager.addFromTextEditor = function(textEditor){
	let doc = docAddFromTextEditor(textEditor);
};
exwDocumentManager.activate = function(){
	docActivate();
};


//#MARK DOCMANAGER Events
exwDocumentManager.onDidSaveDocument = function(fn){
	ide.emitter.on('did-doc-saved', fn);
};
exwDocumentManager.onDidChangeDocumentGrammar = function(fn){
	ide.emitter.on('id-doc-grammer-changed', fn);
};
exwDocumentManager.onDidChangeDocumentSelection = function(fn){
	ide.emitter.on('did-doc-selection-changed', fn);
};
exwDocumentManager.onDidChangeDocumentCursor = function(fn){
	ide.emitter.on('did-doc-line-changed', fn);
};
exwDocumentManager.onDidAddDocument = function(fn){
	ide.emitter.on('did-add-doc', fn);
};
exwDocumentManager.onDidDocumentGetTextEditor = function(fn){
	ide.emitter.on('did-doc-get-editor', fn);
};
exwDocumentManager.onDidChangeActiveDocument = function(fn){
	ide.emitter.on('did-change-active-doc', fn);
};
exwDocumentManager.onDidChangeActiveTextEditor = function(fn){
	ide.emitter.on('did-change-active-text-editor', fn);
};
exwDocumentManager.onDidSelectionChanged = function(fn){
	ide.emitter.on('did-doc-selection-changed', fn);
};
exwDocumentManager.onDidDestroyDoc = function(fn){
	ide.emitter.on('did-doc-destroy', fn);
};


module.exports = exwDocumentManager;
