/*
Jose L Cuevas
https://exponentialworks.com
*/


const { CompositeDisposable, Disposable, TextEditor, File, Directory, Emmiter } = require('atom');

const { ide, dialogManager } = require('./exwIDE.js');
const _atom = require('./exwAtomHelper.js');
const documentManager = require('./exwDocuments.js');
const panelManager = require('./exwPanelView.js');
const parser = require('./exwSymbolParser.js');
const exwListTree = require('./exwListTree.js');
const exwSelectList = require('./exwSelectList.js');
const dom = require('./exwDOMHelper.js');


//modules
const _electron = require("electron");
const path = require('path');
const fs = require('fs');

function replaceAll(string, search, replace) {
  return string.split(search).join(replace);

}

var exwProject = {
	controller: null,
	view: null,
	element: null,
	toolbar: null,
	lists: {
		sym: null,
		bm: null,
		prj: null,
	},
	symbolsView: null,
	symbolsDocumentID: 0,
};

let symGrammerStore = null;

function projectActivate(){

	let jsData = ide.readDataFile('../config/default_sym_grammer.js');
	//console.log('got grammer %s', jsData);

	symGrammerStore = ide.getUserDataFile('exc_sym_grammer.js', jsData);


	if(!symGrammerStore){
		ide.displayError('EXW-IDE: failed to load config file for symbol grammers! [ERR561]');
	}else{
		updateGrammerFromStore();
		ide.emitter.emit('did-prj-got-grammers', exwProject);
	}

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

		exwProject.symbolsDocumentID = doc.id;

		if(!doc.symState){
			updateSymbolsForDocument(doc);
		}

		updateSymbolsTreeForDocument(doc);
	});



	//#MARK COMMAND exw-ide:edit-sym-grammer
	ide.addCommand('exw-ide:edit-sym-grammer', 'Edit grammer file', () => {
		atom.workspace.open(symGrammerStore.path);
	});

	//#MARK COMMAND exw-ide:show-panel
	ide.addCommand('exw-ide:show-explorer', 'Show Explorer Panel', () => {
		atom.workspace.open('atom://exw-ide-prjview');

	});

	//#MARK COMMAND exw-ide:show-symbols
	ide.addCommand('exw-ide:show-symbols', 'Show Symbols', () => {
		if(!documentManager.getActive()) return;
		if(!documentManager.activeDoc.symState){
			updateSymbolsForDocument(documentManager.activeDoc);
		}
		exwProject.symbolsView.show();
	});



	//#MARK COMMAND exw-ide:show-symbols
	ide.addCommand('exw-ide:jump-to-next-bookmark', 'Next Bookmark', () => {
		if(!documentManager.getActive()) return;
		bookmarkJumpToNext();
	});

	//#MARK COMMAND exw-ide:toggle-bookmark
	ide.addCommand('exw-ide:toggle-bookmark', 'Toggle Bookmark', () => {
		if(!documentManager.getActive()) return;
		bookmarkToggle();
	});


	//#MARK COMMAND exw-ide:open-project
	ide.addCommand('exw-ide:open-project', 'Open Project', () => {
		projectShowOpen();
	});

	//#MARK COMMAND exw-ide:save-project
	ide.addCommand('exw-ide:save-project', 'Save Project', () => {
		projectShowSaveCurrent();
	});

	//#MARK COMMAND exw-ide:show-docs
	ide.addCommand('exw-ide:show-docs', 'Show Docs', () => {
		docsShowPanel();
	});





	//toolsActivate();

	projectLoadStore();
	projectBuildOpenPanel();
	projectBuildSavePanel();

	docsInitialize();
	docsBuildPanel();
}
function updateGrammerFromStore(){
	if(!symGrammerStore) return;

	var ctx = {grammers: undefined };
	let src = symGrammerStore.data;

	ide.runJS(src, ctx, symGrammerStore.fileName);

	if(!ctx.grammers){
		ide.displayError('EXW IDE failed to load config file for symbol grammers! [ERR562]');
		return;
	}

	let keys = Object.keys(ctx.grammers);
	for( let grammarId of keys){
		parser.addGrammer(grammarId, ctx.grammers[grammarId]);
	}
};

function handleSymbolClicked(listItem){
	//console.log('eventSymItemClicked %o', listItem);

	if(!documentManager.getActive()) return;

	//console.log(listItem.data);
	let line = listItem.data.row;

	documentManager.activeDoc.gotoLine(line);
}
function updateSymbolsTreeForDocument(doc){
	if(!doc) return;
	if(!doc.symState){
		updateSymbolsForDocument(doc);
	}

	let prj = exwProject;
	let list = prj.lists.sym;
	if(!list) return;

	list.ownerNode = list;

	if(!list.disposables){
		list.disposables = new CompositeDisposable();
	}else{
		list.disposables.dispose();
	}

	list.clear();
	if(!doc.symState) return;

	let firstDept = 0;
	let createItems = function(parent, items, filter){
		firstDept++;
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
				isExpanded: (firstDept == 1) && (sym.items.length > 0),
				data: { row: sym.point.row },
				onAction: (listItem, event) => {
					handleSymbolClicked(listItem);
				},
			};


			if(sym.parent){
				def.data.parentType = sym.parent.symType;
				def.data.parentCaption = sym.parent.title;
				def.data.parentIcon = sym.parent.icon;
			}

			if(sym.attr) def.attr = sym.attr;

			var listEntry = new exwListTree(def);
			listEntry.ownerNode = parent.ownerNode;
			if(!flgNoChilds && sym.items.length > 0){
				createItems(listEntry, sym.items, filter);
			}

			parent.append(listEntry);
		}
		firstDept--;
	};

	createItems(list, doc.symState.items, {});
	list.refresh();
}

function updateSymbolsForDocument(doc){

	if(!doc) return;
	if(!doc.textEditor) return;

	var src = doc.textEditor.getText();
	var grammerId = doc.textEditor.getGrammar().id;
	console.log('EXW-IDE: GRAMMER IS:%s', grammerId);

	doc.symState = parser.parse(grammerId, src);
	console.log('EXW-IDE: symstate %o', doc.symState);
}
function updateSelectedSymbolForDocument(doc){
	if(!doc || !doc.isActive()) return;
	//console.log('@updateSymbolsForDocument %s', doc.id);
}

function symbolFilterState(symState, fnFilter){
	let itemsFound = [];
	let filterSymbol = (sym) =>{
		if(!sym) return [];
		if(fnFilter(sym)){
			itemsFound.push(sym);
		}
		for(let child of sym.items){
			filterSymbol(child);
		}
	};

	for(let sym of symState.items){
		filterSymbol(sym);
	}

	return itemsFound;
}
function symbolsCreateDialog(){
	exwProject.symbolsView = panelManager.createDialog({
		modal: true,
		name: 'ide-symbols',
		title: 'Symbols',
		titleIcon: 'package',
		btnOk: false,
		btnCancel: {caption:'Done'},
		didConfirm: (dlg) =>{
			if(dlg.data.gotoLine === undefined) return;
			if(!documentManager.getActive()) return;

			documentManager.activeDoc.gotoLine(dlg.data.gotoLine);
		},
		onDidShow: (dlg)=> {
			let t = dlg.$('#sym-search-txt');
			t.value = '';
			t.focus();
		},
		contentsModified: (dlg) => {

		}
	});

	exwProject.symbolsView.setData({gotoLine: undefined});

	let div, txt, nlist, nInfo, nSyntax, nDesc;
	let searching = false;

	div = document.createElement('div');
	div.innerHTML = '<input id="sym-search-txt" class="exw-textbox-search input-search exw-textbox" type="search" placeholder="Search" tabindex="-1">' +
	'<div class="exw-error-message" style="display: none;"><span class="exw-error-text"></span></div>' +
	'<div class="exw-select-list select-list" style="margin-top: 10px; max-height: 300px;" is="space-pen-div"><ol class="sym-matches list-group native-key-bindings" tabindex="-1"><li class="list-item text-info"><span>Start typing to search...</span></li></ol></div>';

	exwProject.symbolsView.setContents(div);

	txt = div.querySelector('#sym-search-txt');
	nlist = div.querySelector('.sym-matches');
	nMsg = div.querySelector('.exw-error-text');
	nError = div.querySelector('.exw-error-message');


	exwProject.symbolsView.element.addEventListener('keydown', (event) => {
		if(event.code == 'Enter'){
			if(searching) return;
			let line = nlist.getAttribute('data-def-row');
			if(line === undefined) return;
			event.preventDefault();
			event.stopImmediatePropagation();

			exwProject.symbolsView.data.gotoLine = parseInt(line,10);
			exwProject.symbolsView.doConfirm();
		}
	});




	let findSymbols = (s, dlg) => {

		let doc = documentManager.getActive();
		if(!doc || !doc.symState){
			nlist.innerHTML.innerHTML = '';
			nError.style.display = 'block';
			nMsg.textContent = 'Upps! We no longer have a scanned source...';
			return;
		}


		nlist.innerHTML = '';
		if(!s){
			nError.style.display = 'none';
			return;
		}

		let matched = symbolFilterState(doc.symState, (sym) => {
			if(s==":mark"){
				return (sym.symType == 'sym-mark');
			}

			if(s==":todo"){
				return (sym.symType == 'sym-todo');
			}

			if(!sym.title) return false;
			let s1 = sym.title.substr(0,s.length).toLowerCase();
			return (s1 == s);
		});

		if(matched.length == 0){
			nlist.innerHTML.innerHTML = '';
			nError.style.display = 'block';
			nMsg.textContent = 'Symbol not found...';
			return;
		}

		nError.style.display = 'none';


		for(let sym of matched){
			let elm = document.createElement('li');
			elm.classList.add('two-lines');
			elm.setAttribute('style','border-left: 4px inset transparent');
			elm.setAttribute('is', 'space-pen-li');

			let caption, elmClass='primary-line icon', data = 'data-row="' + sym.point.row + '"';

			if(sym.parent && (['sym-obj', 'sym-module', 'sym-css-style'].indexOf(sym.parent.symType) >= 0)){
				caption = sym.parent.title + "::" + sym.title;
			}else{
				caption = sym.title;
			}
			if(sym.symType == 'sym-fn'){
				caption+= '()';
			}

			if(sym.icon){
				caption = '<div class="icon ' + sym.icon + '" style="color: " ' + data + '>'  + caption + '</div>';
			}else{
				caption = '<div class="no-icon" style="color: " ' + data + '>'  + caption + '</div>';
			}


			if(sym.icon.indexOf('exw-')===0){
				elmClass+=' with-image ';
			}
			elmClass += sym.icon;


			out = '<div class="' + elmClass + '">' + caption + '</div>';
			out+= '<div class="secondary-line"><div class="no-icon" style="" ' + data + '> Line: '  + sym.point.row + '</div></div>';

			elm.innerHTML = out;



			nlist.appendChild(elm);
		}

		if(matched.length == 1){
			nlist.setAttribute('data-def-row', matched[0].point.row);
		}
	};


	txt.addEventListener('input', (event) => {
		event.preventDefault();
		event.stopImmediatePropagation();

		if(searching) return;
		searching = true;
		findSymbols(txt.value, this.symView);
		searching = false;
	});


	nlist.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopImmediatePropagation();
		if(searching) return;

		let o = event.target;
		exwProject.symbolsView.data.gotoLine = parseInt(o.getAttribute('data-row'),10);
		exwProject.symbolsView.doConfirm();
	});
}
//#MARK ATOM COMMANDO

ide.emitter.on('commando-ready', function(term, view){
	console.log("@commando-ready event")
	term.commandRegistry.add('version', function(args){
		console.log(this);
		this.terminal.write("Verion 1.0\n\tBy \u001b[34mExponential\u001b[32;1mWorks ");
		this.terminal.write("Test \u001b[4mUnderline \u001b[4;9;3mINVALID\u001b[0;4m test");
		this.terminal.write("Blink \u001b[36;5m HELLO \u001b[0m Done");
	});

	term.commandRegistry.add('ed', function(args){
		console.log("this=%o",this);
		console.log("args1=%o",arguments);
		console.log("args2=%o",args);
		if(this.command.hasArg("l")){
			console.log("Line=%s", this.command.getArg('l', 8));
		}
		this.terminal.write("Hello...");
	});

	term.setStatusText('Ready...');
});






function projectBuildPanelView(){

	let prj = exwProject;
	prj.view = panelManager.create({
		name: 'prjview',
		icon: 'browser',
		title: 'Explorer',
		deserializer: 'prjPanelRestore',
		defaultLocation: 'left',
		allowedLocation: ['left', 'right'],
	});

	prj.view.setDelegate(prj);
	let view = prj.view;

	const tb = '<div class="exw-panel-toolbar"><div class="exw-tool-bar tool-bar tool-bar-top tool-bar-horizontal tool-bar-12px"><input id="fld-prj-search" type="text" placeholder="filter" title="filter symbols..." class="exw-textbox-search input-search exw-textbox"><button class="btn btn-default tool-bar-btn exw-tool-btn-with-icon is-close"></button></div></div>'
	view.append('header', tb);

	prj.searchNode = view.$('#fld-prj-search');

	let searching = false;
	prj.searchNode.addEventListener('input', (event) => {
		event.preventDefault();
		event.stopImmediatePropagation();
		if(searching) return;
		searching = true;
		let s = txt.value;

		//this.eventFilterTextChanged(s);
		searching = false;
	});


	prj.lists.bm = new exwListTree({ attr:{id:'exw-ide-bm-tree'}, caption:'BOOKMARKS', isFolder: true, isRoot: true, isExpanded: false });
	prj.lists.sym = new exwListTree({ attr:{id:'exw-ide-sym-tree'}, caption:'SYMBOLS', isFolder: true, isRoot: true, isExpanded: true });
	prj.lists.tools = new exwListTree({ attr:{id:'exw-ide-tools-tree'}, caption:'TOOLS', isFolder: true, isRoot: true, isExpanded: false });

	view.append('body', prj.lists.bm.element);
	view.append('body', prj.lists.sym.element);
	view.append('body', prj.lists.tools.element);


}
//#MARK ATOM BOOKMARKS
function bookmarkToggle(){
	let prj = exwProject;

	if(!documentManager.getActive()) return;
	let doc = documentManager.activeDoc;
	let editor = doc.textEditor;
	let markerLayer = doc.markerLayer

	for (const range of editor.getSelectedBufferRanges()) {
		const bookmarks = markerLayer.findMarkers({intersectsRowRange: [range.start.row, range.end.row]});
		if (bookmarks && bookmarks.length > 0) {
			for (const bookmark of bookmarks) {
				bookmark.destroy()
			}

		} else {
			const bookmark = markerLayer.markBufferRange(range, {invalidate: 'surround', exclusive: true});
			doc.disposables.add(bookmark.onDidChange(({isValid}) => {
	  			if (!isValid) {
	    			bookmark.destroy();
	  			}
				handleBookmarksChanged();
			}));
		}
	}//end for

	handleBookmarksChanged();

}
function handleBookmarksChanged(){
	updateBookmarksTree();
	//#MARK EMITS did-bookmarks-change
	documentManager.getActive()
	ide.emitter.emit('did-bookmarks-change', documentManager.activeDoc);
}
function bookmarkJumpToNext() {
	let prj = exwProject;

	if(!documentManager.getActive()) return;
	let doc = documentManager.activeDoc;
	let editor = doc.textEditor;


	if (doc.markerLayer.getMarkerCount() > 0) {
		const bufferRow = editor.getLastCursor().getMarker().getStartBufferPosition().row;
		const markers = doc.markerLayer.getMarkers().sort((a, b) => a.compare(b));
		const bookmarkMarker = markers.find((marker) => marker.getBufferRange().start.row > bufferRow) || markers[0];
		editor.setSelectedBufferRange(bookmarkMarker.getBufferRange(), {autoscroll: false})
		editor.scrollToCursorPosition();
	} else {
		atom.beep();
	}
}
function updateBookmarksTree(){

	console.log('populating bookmarks...');

	let prj = exwProject;
	let list = prj.lists.bm;
	if(!list) return;

	if(!list.disposables){
		list.disposables = new CompositeDisposable();
	}else{
		list.disposables.dispose();
	}

	list.clear();

	if(!documentManager.getActive()) return;

	let doc = documentManager.activeDoc;
	let editor = doc.textEditor;

	for (const marker of doc.markerLayer.getMarkers()) {
		const bmStartRow = marker.getStartBufferPosition().row;
		const bmEndRow = marker.getEndBufferPosition().row;


		const lnText = editor.lineTextForBufferRow(bmStartRow);
		const lnCaption = 'Ln: ' +  (bmStartRow + 1);

		console.log("BM @LN:%d TEXT=%s",bmStartRow, lnText);

		var def = {
			type: "sym-marker", caption: lnCaption, icon: 'exw-icn-bm',
			isRoot: false,
			isFolder: false,
			isExpanded: false,
			data: { row: bmStartRow },
			onAction: (listItem, event) => {
				handleSymbolClicked(listItem);
			},
			decorate: (element, labelNode) => {
				list.disposables.add(atom.tooltips.add(labelNode, {title:'Line: ' + lnText, placement: 'auto right'}));
			}
		};


		var listEntry = new exwListTree(def);
		list.append(listEntry);
	}

	list.refresh();
}

//#MARK STATE

function stateInitialize(){

}
//#MARK ATOM PROJECTS
function projectLoadStore(){

	let prj = exwProject;
	prj.projectsStore = undefined;
	prj.projectsStore = ide.getUserConfigFile('exc_projects.json', {});
}
function projectShowOpen(){

	let prj = exwProject;
	if( prj.openView.isVisible() ){
		 prj.openView.hide();
		return;
	}

	prj.openView.show();
}
function projectGetHash(){
	const crypto = require('crypto');
	const hash = crypto.createHash('sha256');

	for(let p of atom.project.getPaths()){
		hash.update(p);
	}

	return hash.digest('hex');
}
function projectShowSaveCurrent(){
	let prj = exwProject;

	let paths = atom.project.getPaths();
	let uid = projectGetHash();

	if (!uid) return;

	let prjData = prj.projectsStore.get(uid);

	if(!prjData){
		prjData = {name: 'My Project', uid: uid, icon: 'icon-briefcase', paths: paths, devMode: false};

		if(paths.length){
			let file = new Directory(paths[0]);
			prjData.name = file.getBaseName();
		}
	}

	let form = prj.saveView;
	form.setData(prjData);
	form.show();
}
function projectOpenWith(uid){

	let prj = exwProject;
	let data = prj.projectsStore.get(uid);

	//console.log("@projectOpenWith %s %o", uid, data);
	if(!data) return;
	atom.open({
		devMode: data.devMode,
		pathsToOpen: data.paths,
	});
}
function projectSaveCurrent(data){
	let prj = exwProject;

	console.log(data);

	prj.projectsStore.set(data.uid, data);
	prj.projectsStore.save();

	//let state = atom.serialize({isUnloading: true});
	//atom.stateStore.save(data.uid, state);

	//#MARK EMITS did-save-project
	ide.emitter.emit('did-save-project', prj, data);
}
function projectBuildSavePanel(){
	let prj = exwProject;

	prj.saveView = panelManager.createDialog({
		modal: true,
		name: 'save-prj',
		title: 'Save Project',
		titleIcon: 'package',
		btnOk: {caption: 'Save', icon: 'icon-check'},
		didConfirm: (dlg) =>{
			if(!dlg.data) return;

			dlg.data.name = dlg.$("#fld-prj-name").value;
			dlg.data.icon = dlg.$("#fld-prj-icon").value;
			dlg.data.devMode = dlg.$("#fld-dev-mode").checked;


			projectSaveCurrent(dlg.data);
		},
		onDidShow: (dlg)=> {
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

	prj.saveView.setContents((dlg)=>{
		let s = '<h1 class="block section-heading">Save Project</h1><div class="block"><label class="input-label">Name</label><input id="fld-prj-name" autofocus="" type="text" class="input-text exw-textbox" tabindex="0"></div><div class="block"><label class="input-label">Icon</label><input id="fld-prj-icon" type="text" class="input-text exw-textbox" tabindex="2"></div><div class="block"><label class="input-label">Development mode</label><input id="fld-dev-mode" type="checkbox" class="input-toggle" tabindex="4"></div><div class="block" style="padding: 6px 6px;"><b>Paths:</b><br><span id="lbl-paths"></span><br><br><b>ID: </b><span id="lbl-uid"></span></div>';
		return s;
	});
}
function projectBuildOpenPanel(){
	let prj = exwProject;


	let openViewList = new exwSelectList({
		title:'Open a project...',
		titleIcon: 'icon-file-directory',
		selectMultiple: false,
		didConfirmSelection: (selected) => {
			console.log('selected items %o', selected);
			let item = selected[0];
			let uid = item.getAttribute('data-prj-uid');
			console.log('confirmed %o', item);
			console.log('prj-uid=%s', path);
			prj.openView.hide();

			projectOpenWith(uid);
		},
		didDblClickSelection: (selected) => {
			let item = selected[0];
			let uid = item.getAttribute('data-prj-uid');
			console.log('confirmed %o', item);
			console.log('prj-uid=%s', path);
			prj.openView.hide();

			projectOpenWith(uid);
		},
		didCancelSelection: () => {
			console.log('cancelled');
			prj.openView.hide();
		}
	});

	prj.openView = panelManager.createDialog({
		modal: true,
		name: 'open-prj',
		title: 'Open Project',
		titleIcon: 'package',
		btnOk: false,
		btnCancel: false,
		didConfirm: (dlg) =>{

		},
		onDidShow: (dlg)=> {
			console.log("@open-prj.onDidShow");
			dlg.setContents(openViewList.getElement());
			projectUpdateOpenView(dlg, openViewList);
		},
		contentsModified: (dlg) => {

		}
	});
}

function projectUpdateOpenView(dialog, listView){
	let prj = exwProject;
	prj.projectsStore.read();

	var listItems = [];

	let keys = Object.keys(prj.projectsStore.data);
	for(let uid of keys){
		let data = prj.projectsStore.data[uid];
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

	listView.setItems(listItems);
	listView.focusFilterEditor();
}


//#MARK ATOM DOCSETS
docsInitialize();
docsBuildPanel();

function docsInitialize(){
	let prj = exwProject;
	prj.langDoc = {
		_isVirgin: true,
		items: new Map(),
	};




	function readDoc(fpath){
		let lines = fs.readFileSync(fpath, 'utf8').split(/\n/g);

		let fileName = path.basename(fpath, '.txt');
		console.log("Loading Doc file %s", fileName);

		let code = fileName.replace('lang_doc_','');

		let lang = {
			uid: code,
			name: code.toUpperCase(),
			path: fpath,
			grammers:['text.html.php', 'source.php'],
			fnIndex: {}
		};

		let k = '';
		for(let i = 0; i< lines.length; i++){
			let sd = lines[i].split(/\%/g);
			let fn = sd[0].toLowerCase();

			k = fn.charAt(0);
			if(!lang.fnIndex[k]) lang.fnIndex[k] = {keys:[],entries:{}};
			let index = lang.fnIndex[k];

			if(index.keys.indexOf(fn) >= 0) continue;
			index.keys.push(fn);
			index.entries[fn] = {key:fn,sig:sd[1], desc:sd[2]};

		}
		prj.langDoc.items.set(lang.uid, lang);
		//console.log(lang);
	}

	//load tools
	let configFolder = new Directory(ide.pathUserData);
	let docsFolder = configFolder.getSubdirectory('exw-ide-docs');

	console.log("Loading Docs from %s", docsFolder.getPath());

	docsFolder.exists().then(exist =>{
		if(!exist) return;
		docsFolder.getEntries((err, files)=>{
			for(var i=0; i<files.length; i++){
				var file = files[i];
				if(file.isDirectory()) continue;
				let fileName = file.getBaseName();
				console.log("Checking Doc file %s", fileName);
				if(!/^lang_doc_([A-Za-z\-]+)\./.exec(fileName)) continue;
				readDoc(file.getPath());
			}
		});
	});


}
function docsShowPanel(){
	let prj = exwProject;
	if(!prj.docsView) return;
	prj.docsView.setData({});
	prj.docsView.show();
}
function docsBuildPanel(){
	let prj = exwProject;

	let div, txt, nlist, nInfo, nSyntax, nDesc, nSelect;
	prj.docsView = panelManager.createDialog({
		modal: true,
		name: 'lang-docs',
		title: 'Quick Docs',
		titleIcon: 'file-code',
		btnOk: false,
		btnCancel: {cpation: 'Done'},
		didConfirm: (dlg) =>{

		},
		onDidShow: (dlg)=> {
			console.log("docs show dlg %o". dlg);

			if(!dlg.data) return;
			nSelect.innerHTML = '';
			let s = '';
			let fuid = '';
			for(let [uid, lang] of prj.langDoc.items){
				if(!fuid) fuid = lang.uid;
				s += '<option value="' + lang.uid + '">' + lang.name + '</option>';
			}
			dlg.data.uid = fuid;
			nSelect.innerHTML = s;
		},
		contentsModified: (dlg) => {

		}
	});


	div = document.createElement('div');
	div.innerHTML = '<div><input id="lang-search-txt" class="exw-textbox-search input-search exw-textbox" type="search" placeholder="Search" tabindex="-1">' +
	'</div></div>' +
	'<div class="exw-error-message" style="display: none;"><span class="exw-error-text"></span></div>' +
	'<div class="lang-fn-ref" style="display: none; margin-top: 10px;">' +
	'<div class="lang-fn-syntax" style="font-family: monospace;"></div><div class="lang-fn-description" style=""></div>' +
	'<div style="margin-top: 6px; text-align: right;"><button class="btn btn-xs btn-primary icon icon-clippy" id="lng-cmd-copy" title="Copy"> Copy</button> &nbsp; <button class="btn btn-xs btn-primary icon icon-pencil" id="lng-cmd-insert" title="Copy"> Insert</button></div></div>' +
	'<div class="lng-fn-list" style="margin-top: 10px; max-height: 300px; overflow: auto;"><ul class="lang-fn-matches list-group" ><li class="list-item text-info"><span>Start typing to search...</span></li></ul></div>';

	prj.docsView.setContents(div);

	txt = div.querySelector('#lang-search-txt');
	nlist = div.querySelector('.lang-fn-matches');
	nInfo = div.querySelector('.lang-fn-ref');
	nSyntax = nInfo.querySelector('.lang-fn-syntax');
	nDesc = nInfo.querySelector('.lang-fn-description');

	prj.docsView.with('footer').prepend('<span style="color:#518AED;">Doc Set</span> <select id="lang-select" class="input-select"></select> &nbsp;');
	nSelect = prj.docsView.$('#lang-select');

	let findFunctions = (s, dlg) => {
		console.log('Searching for %s',s);
		let uid = dlg.data.uid;
		let lang = prj.langDoc.items.get(uid);

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

		//console.log(matches);
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

			if(matches.length == 1){
				searching = false;
				nlist.querySelector('span[data-lang]').click();
			}
		}
	};

	let searching = false;
	txt.addEventListener('input', (event) => {
		event.preventDefault();
		event.stopImmediatePropagation();
		if(searching) return;
		searching = true;
		findFunctions(txt.value, prj.docsView);
		searching = false;
	});


	nSelect.addEventListener('change', (event) => {
		nInfo.style.display = 'none';
		nlist.innerHTML = '';

		prj.docsView.data.uid = nSelect.value;
		nSelect.innerHTML = s;
	});

	nInfo.querySelector('#lng-cmd-copy').addEventListener('click', (event) => {
		atom.clipboard.write(nSyntax.textContent);
		prj.docsView.hide();
	});

	nInfo.querySelector('#lng-cmd-insert').addEventListener('click', (event) => {
		const txt = nSyntax.textContent;
		const editor = atom.workspace.getActiveTextEditor();
		const selection = editor.getSelectedText();
		editor.insertText(txt);
		prj.docsView.hide();
	});


	nlist.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopImmediatePropagation();
		if(searching) return;


		let o = event.target;
		let uid = o.getAttribute('data-lang');
		let k = o.getAttribute('data-index');
		let fn = o.getAttribute('data-fn');

		if(!fn) return;


		let lang = prj.langDoc.items.get(uid);
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


//#MARK EXWPROJECT decorate
exwProject.activate = function(){
	projectActivate();
};

exwProject.prjview_didShow = function(view, event, item, pane){
	console.log('@prj_view_didShow %s', view.name);


	if(this.tools && this.tools._isVirgin){
		this.tools._isVirgin = false;
		updateToolsTree();
	}


	if(!documentManager.getActive()) return;

	if(!this.symbolsDocumentID){
		updateSymbolsTreeForDocument(documentManager.activeDoc);
	}



};
exwProject.prjview_willDestroy = function(view, event, item, pane){
	console.log('@prjview_willDestroy %s', view.name);
	this.symbolsDocumentID = 0;
	this.lists.sym.clear();

};

exwProject.prjview_didActivate = function(view, event, item, pane){
	console.log('@prjview_didActivate %s', view.name);

	if(!documentManager.getActive()) return;

	if(!this.symbolsDocumentID != documentManager.activeDoc.id){
		updateSymbolsTreeForDocument(documentManager.activeDoc);
	}
};

exwProject.getPanelView = function(){
	if(!this.view){
		projectBuildPanelView();
	}
	return this.view;
};
exwProject.restorePanelView = function(){
	return this.getPanelView();
};
exwProject.toolRunWithUID = function(uid, hook){
	toolRunWithUID(uid, hook);
};



module.exports = exwProject;
