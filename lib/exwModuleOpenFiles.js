'use babel';

/*
Jose L Cuevas
https://exponentialworks.com
*/

const path = require('path');

var exwModule = {
	name: 'Open Files',
	treeView: null,
	group: null,
	ide: null,
	openFiles: [],
	initialize: function(ide){
		this.ide = ide;


		this.group = ide.ui.treeView.createGroup({
			name: 'OPEN FILES',
		});


		for( const [docID, doc] of ide.documentManager.items ){
			console.log("open-files %s", doc.title);
			this.appendItem(doc, null);
		}
		ide.emitter.on('did-add-doc', (doc) => {
			console.log("open-files %s", doc.title);

			this.appendItem(doc, null);
		});

		ide.emitter.on('did-doc-destroy', (doc)=> {
			let found = [];
			let keep = [];

			this.openFiles.map( (entry) => {
				if(entry.doc.id == doc.id){
					found.push(entry);
				}else{
					keep.push(entry);
				}
			} );

			if( !found.length ) return;
			this.openFiles = keep;
			for( let entry of found ){
				if(entry.element){
					this.group.container.removeChild(entry.element);
				}
			}

		});
	},

	appendItem: function(doc, pane){
		const found = this.openFiles.filter( (entry) => {
			return (entry.doc.id == doc.id);
		} );

		if( found.length ) return;


		var entry = { doc: doc };
		entry.dirName = path.dirname(doc.path);
		entry.ext = path.extname(doc.path);

		let listItem = document.createElement('li');
		listItem.classList.add('file', 'list-item', 'exw-open-files-item');
		listItem.setAttribute('is', 'tree-view-file');

		let closer = document.createElement('button');
		closer.classList.add('close-open-file');
		closer.addEventListener("click", (event)=> {
			console.log("closing doc path %s", doc.id);
			doc.close();

			this.group.container.removeChild(listItem);
		});

		listItem.appendChild(closer);

		let listItemName = document.createElement('span');
		listItemName.classList.add('name', 'icon', 'icon-file-text');
		listItemName.setAttribute('data-name', doc.title);
		listItemName.setAttribute('data-path', doc.path);
		listItemName.setAttribute('title', doc.path);
		listItemName.textContent = doc.title;
		listItemName.addEventListener("click", (event)=> {
			console.log("click doc path %s path=%s", doc.id, doc.path);

			atom.workspace.open(doc.textEditor);
		});

		listItem.appendChild(listItemName);

		listItem.getPath = function() {
			return doc.path;
		};

		if(doc.textEditor.isModified()){
			listItem.classList.toggle('modified', true);
		}
		this.ide.disposables.add( doc.textEditor.onDidChangeModified( modified => {
			listItem.classList.toggle('modified', modified);
		}));
		this.ide.disposables.add( doc.textEditor.onDidChangeTitle( () => {
			listItemName.textContent = doc.textEditor.getTitle();
		}));

		entry.element = listItem;

		this.openFiles.push( entry );

		this.group.container.appendChild(listItem);
	}
};


export default exwModule;
