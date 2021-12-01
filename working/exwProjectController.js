'use babel';

/*
Jose L Cuevas
https://exponentialworks.com
*/

var exwProjectController = {
	panel: null,
	host: null,
	documents: [],
	docActive: null,
	projectPanel: {
		element: null,
		toolbar: null,
	},
	lists: {
		sym: null,
		bm: null,
		prj: null,
	},
	setHost: function(host){
		this.host = host;
	},
	buildPanel: function(panelNode){
		if(!panelNode) return;

		this.projectPanel.element = panelNode;

		// Create toolbar
		this.projectPanel.toolbar = this.toolbar = document.createElement('div');
		this.projectPanel.toolbar.classList.add('exw-tool-bar', 'tool-bar', 'tool-bar-top', 'tool-bar-horizontal', 'tool-bar-12px');
		panelNode.appendChild(this.projectPanel.toolbar);

		let tb = this.projectPanel.toolbar;

		//filter textbox
		var txt = document.createElement('input');
		txt.setAttribute("type","text");
		txt.setAttribute("placeholder","filter");
		txt.setAttribute("title","filter symbols...");
		txt.classList.add('input-text', 'exw-textbox');

		tb.appendChild(txt);

		let searching = false;
		txt.addEventListener('input', (event) => {
			event.preventDefault();
			event.stopImmediatePropagation();
			if(searching) return;
			searching = true;
			let s = txt.value;

			this.eventFilterTextChanged(s);
			searching = false;
		});

		txt.addEventListener('blur', (e)=>{
			//_view.handleFilter(txt.value);
		});
		txt.addEventListener('keypress', (e)=>{
			if(e.keyCode == 13 || e.keyCode == 10){
				this.eventTextConfirmedChanged(s);
			}
		});


		var btn = document.createElement('button');
		btn.classList.add('btn', 'btn-default','tool-bar-btn','exw-tool-btn-with-icon','is-close');
		tb.appendChild(btn);

		btn.addEventListener('click', function(e){
			if(txt.value == '') return;
			txt.value = '';
			this.eventFilterTextChanged('');
		});

		this.lists.bm = new exwListTree({id:'nst-bm-tree', caption:'BOOKMARKS', isFolder: true, isRoot: true });
		this.lists.sym = new exwListTree({id:'nst-sym-tree', caption:'SYMBOLS', isFolder: true, isRoot: true });

		panelNode.appendChild(this.lists.bm.element);
		panelNode.appendChild(this.lists.sym.element);

	},
	symFilter: function(s){
		if(this.lists.sym._hasFilter){

		}
		if(scope && s){
			let matched = this.lists.sym.filter((item) => {
				return (item.caption.indexOf(s)===0)
			});

			for(let item of matched){

			}
		}
	},
	eventTextConfirmedChanged: function(text){
		console.log('filter changed %s', text);
		let scope, s;
		if(text.indexOf(':') >= 0){
			[scope, s] = text.split(/:/g);
		}else{
			s = text;
		}

		if(scope && s){
			if(scope == 'sym'){
				this.symFilter(s);
			}
		}else{
			if(this.lists.sym._hasFilter){

			}
		}

	},
	eventFilterTextChanged: function(text){
		console.log('filter changed %s', text);

	},
	eventSymItemClicked: function(listItem){
		console.log('eventSymItemClicked %s', listItem);
	},
	docCreate: function(textEditor){
		var doc = {
			id: textEditor.id,
			textEditor: textEditor,
			destory: function(){
				this.deactivate();
				if(this.markerLayer) this.markerLayer.destroy();
			},
			deactivate: function() {
    			if(this.decorationLayer) this.decorationLayer.destroy();
				if(this.disposables) this.disposables.dispose();
			}
		};

		doc.disposables = new CompositeDisposable();
		doc.markerLayer = textEditor.addMarkerLayer({persistent: true});
		doc.decorationLayer = textEditor.decorateMarkerLayer(doc.markerLayer, {type: 'line-number', class: 'bookmarked'});

		doc.title = textEditor.getTitle();

		let editor = textEditor;

		doc.disposables.add(atom.commands.add(atom.views.getView(textEditor), {
			'nst:toggle-bookmark': () => this.bmToogle(),
			//'nst:jump-to-next-bookmark': this.bmJumpToNext.bind(this),
			//'bookmarks:jump-to-previous-bookmark': this.jumpToPreviousBookmark.bind(this),
			//'bookmarks:select-to-next-bookmark': this.selectToNextBookmark.bind(this),
			//'bookmarks:select-to-previous-bookmark': this.selectToPreviousBookmark.bind(this),
			//'bookmarks:clear-bookmarks': this.clearBookmarks.bind(this)
		}));

		doc.disposables.add(textEditor.observeSelections(selection => {
			console.log("selection observeSelections");
			console.log('doc %o', doc);
			if(doc != this.docActive) return;


			this.hookActiveDocSelectionChanged();


		}));
		doc.disposables.add(textEditor.onDidSave(path => {
			console.log("doc onDidSave %s", path);
			console.log('doc %o', doc);
			if(doc != this.docActive) return;
			if(editor.isModified()) return;

			//this.hookActiveDocSelectionChanged();

		}));

		doc.disposables.add(textEditor.onDidChangeCursorPosition(e => {
			console.log("doc onDidChangeCursorPosition");
			console.log('doc %o', doc);
			console.log('doc %o', this.docActive);
			if(doc != this.docActive) return;
			if(e.oldBufferPosition.row == e.newBufferPosition.row) return;


			this.hookActiveDocSelectionChanged();


			//this.selectClosestToRow(e.newBufferPosition.row);
		}));

		return doc;
	},
	symPopulateList: function(state){
		if(!this.docActive) return;


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
					lnTarget: sym.point.row,
					onAction: (listItem, event) => {
						this.eventSymItemClicked(listItem);
					},
				};


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
	symCreateDialog: function(){
		this.symView = exwAtom.createDialog({
			name: 'ide-func-doc',
			title: 'Functions',
			titleIcon: 'package',
			btnOkCaption: 'Done',
			btnOkIcon: 'icon-check',
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
		div.innerHTML = '<input id="sym-search-txt" class="exw-textbox-search input-search exw-textbox" type="search" placeholder="Search" tabindex="-1">' +
		'<div class="exw-error-message" style="display: none;"><span class="exw-error-text"></span></div>' +
		'<div class="exw-select-list select-list" style="margin-top: 10px; max-height: 300px; overflow: auto;"><ul class="sym-matches exw-select-list list-group native-key-bindings" ><li class="list-item text-info"><span>Start typing to search...</span></li></ul></div>';

		this.symView.setContents(div);

		txt = div.querySelector('#sym-search-txt');
		nlist = div.querySelector('.sym-matches');
		nMsg = div.querySelector('.exw-error-text');
		nError = div.querySelector('.exw-error-message');
		let findSymbols = (s, dlg) => {
			console.log('Searching for %s',s);

			if(!s){
				nlist.innerHTML.innerHTML = '';
				nError.style.display = 'none';
				return;
			}

			let matched = this.lists.sym.filter((item) => {
				return (item.caption.indexOf(s)===0)
			});

			if(matched.length == 0){
				nlist.innerHTML.innerHTML = '';
				nError.style.display = 'block';
				nMsg.textContent = 'Symbol not found...';
				return;
			}
			nError.style.display = 'none';

			for(let item of matched){
				let elm = document.createElement('li');
				elm.setAttribute('style','border-left: 4px inset transparent');


				elm.innerHTML = '<div class="primary-line"><div class="no-icon" style="color: ">'  + s + '</div></div>';

			}

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
}


export { exwProjectController };
