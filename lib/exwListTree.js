'use babel';

/*
Jose L Cuevas
https://exponentialworks.com
*/

function exwListTree(ops){

	this.items = [];


	var def = ops;
	if(!ops.hasOwnProperty('attr')){
		def.attr = {};
	}
	if(ops.hasOwnProperty('classes')){
		def.classes = {};
	}

	this.ownerNode = undefined;
	this.element = undefined;
	this.labelNode = undefined;
	this.listNode = undefined;
	this.entryNode = undefined;

	this.iconClass = '';

	this.setOwner = function(item){
		this.ownerNode = item;

	}
	this.destroy = function(){

	};
	this.append = function(item){
		if(this.ownerNode){
			item.ownerNode = this.ownerNode;
		}else{
			item.ownerNode = this;
		}

		this.items.push(item);

		//console.log(item);
	};
	this.clear = function(){
		if(!this.element) return;
		if(this.isFolder){
			this.clearChilds();
		}
	};
	this.clearChilds = function(){
		if(!this.element) return;
		if(!this.isFolder) return;

		//if(this.listNode.innerHTML) this.listNode.innerHTML = "";
		let oldItems = this.items;
		this.items = [];
		for(let item of oldItems){
			if(!item.element) continue;
			this.listNode.removeChild(item.element);
		}
	};
	this.refresh = function(){
		if(!this.element) return;

		if(this.isFolder){
			this.refreshFolder();
		}else{
			this.refreshItem();
		}
	};
	this.refreshBasic = function(){
		if(!this.element) return;
		if(!this.labelNode) return;


		var target = (this.isRoot) ? this.element.firstChild : this.element;
		if(this.isFolder){
			if(this.isExpanded){
				target.classList.add('expanded');
				target.classList.remove('collapsed');
			}else{
				target.classList.add('collapsed');
				target.classList.remove('expanded');
			}
		}

		if(this.isSelected){
			target.classList.add('selected');
		}else{
			target.classList.remove('selected');
		}

		if(this.data.filePath){
			this.labelNode.setAttribute('data-path', this.data.filePath);

			if(this.data.fileName){
				this.labelNode.setAttribute('data-name', this.data.fileName);
			}
		}else if(this.labelNode.hasAttribute('data-path')){
			this.labelNode.removeAttribute('data-path');
			this.labelNode.removeAttribute('data-name');
		}

		if(this.icon){
			this.iconClass = this.icon;
			if(this.icon.indexOf('exw-')===0){
				this.labelNode.classList.add('with-image');
			}else{
				this.labelNode.classList.remove('with-image');
			}
			this.labelNode.classList.add(this.icon);
		}else if(this.iconClass){
			this.labelNode.classList.remove('with-image');
			this.labelNode.classList.remove(this.iconClass);
			this.iconClass = '';
		}



		s = this.caption;
		if(this.isRoot) s= '<strong>' + s + '</strong>';

		this.labelNode.innerHTML = s;
	};
	this.refreshItem = function(){
		if(!this.element) return;
		if(!this.labelNode) return;
		this.refreshBasic();
	};

	this.refreshFolder = function(){
		if(!this.element) return;
		if(!this.labelNode) return;

		this.refreshBasic();


		var nodeFound = undefined;
		var nodesToRemove = [];
		for(let childItem of this.items){
			if(!childItem.element) continue;

			nodeFound = undefined;
			for (let childNode of this.listNode.childNodes) {
				if(childNode == childItem.element){
					nodeFound = childNode;
					break;
				}
			}

			if(!nodeFound){
				this.listNode.appendChild(childItem.element);
			}

			childItem.refresh();
		}

		for (let childNode of this.listNode.childNodes) {
			var flgKeep = false;
			for(let childItem of this.items){
				if(!childItem.element) continue;
				if(childNode == childItem.element){
					flgKeep = true;
					break;
				}
			}
			if(!flgKeep) nodesToRemove.push(childNode);
		}
		for(let childItem of nodesToRemove){
			this.listNode.removeChild(childItem);
		}

	};
	this.select = function( item ){
		if(!this.isFolder) return;


		var o = this.listNode.querySelector('.selected');
		if(o){
			o.classList.remove("selected");
		}

		if(!item) return;

		let target = (item.isRoot) ? item.element.firstChild : item.element;
		target.classList.add('selected');

	};
	this.filter = function( fnFilter ){
		if(!this.isFolder) return;
		if(!fnFilter || typeof(fnFilter) != 'function') return;

		var itemsFound = [];
		for(let childItem of this.items){
			if(fnFilter(childItem)){
				itemsFound.push(childItem);
			}

			if(!childItem.isFolder) continue;

			let found = childItem.filter(fnFilter);
			itemsFound = itemsFound.concat(found);
		}

		return itemsFound;
	};

	this.folderToggle = function(){
		if(!this.element) return;
		if(!this.labelNode) return;


		if(!this.isFolder) return;
		var target = (this.isRoot) ? this.element.firstChild : this.element;

		if(this.isExpanded){
			target.classList.add('collapsed');
			target.classList.remove('expanded');
		}else{
			target.classList.add('expanded');
			target.classList.remove('collapsed');
		}
		this.isExpanded = !this.isExpanded;

	};
	this.folderExpand = function(){
		if(!this.element) return;
		if(!this.labelNode) return;

		if(!this.isFolder) return;
		this.isExpanded = true;
		var target = (this.isRoot) ? this.element.firstChild : this.element;
		target.classList.add('expanded');
		target.classList.remove('collapsed');
	};
	this.folderCollapse = function(){
		if(!this.element) return;
		if(!this.labelNode) return;

		if(!this.isFolder) return;
		this.isExpanded = false;
		var target = (this.isRoot) ? this.element.firstChild : this.element;
		target.classList.add('collapsed');
		target.classList.remove('expanded');
	};

	this.actions = {
		lngoto: function(row){
			if(!view.currentEditor) return;
			if(!row) return;


			if(e.hasOwnProperty('lnTarget')){
				let line = e.lnTarget;
				view.currentEditor.scrollToBufferPosition([line, 1]);
				view.currentEditor.setCursorBufferPosition([line, 1]);
				view.currentEditor.moveToFirstCharacterOfLine();
			}
		}
	};

	this.createCommon = function(){
		if(!this.element) return;
		if(!this.labelNode) return;

		if(def.decorate){
			def.decorate(this.element, this.labelNode);
		}

		for(let ak of Object.keys(def.attr)){
			if(ak == 'class'){
				for(let cn of def.attr.class){
					this.labelNode.classList.add(cn);
				}
				continue;
			}
			this.labelNode.setAttribute(ak, def.attr[ak]);
		}


		var rowTarget = this.element;
		if(this.isRoot){
			rowTarget = this.element.firstChild;
		}

		let fnOnAction = (event) => {
			if(def.onAction){
				def.onAction(this, event);
			}
			this.itemSelectElement(rowTarget);
		};

		let fnOnClick = (event) => {
			if(def.onClick){
				def.onClick(this, event);
			}
			this.itemSelectElement(rowTarget);
		};

		rowTarget.addEventListener("dblclick", (event) => {
			if(event.shiftKey || event.metaKey || event.ctrlKey){
				return;
			}
			event.stopImmediatePropagation();
			event.preventDefault();

			if(this.isFolder){
				let r = this.labelNode.getBoundingClientRect();
				if (event.x < r.left) {
					this.folderToggle();
					return;
				}
			}

			fnOnAction(event);

		});
		rowTarget.addEventListener("click", (event) => {
			if(event.shiftKey || event.metaKey || event.ctrlKey){
				return;
			}
			event.stopImmediatePropagation();
			event.preventDefault();


			if(this.isFolder){
				let r = this.labelNode.getBoundingClientRect();
				if (event.x < r.left) {
					this.folderToggle();
					return;
				}
			}

			fnOnClick(event);

		});
	};
	this.itemSelectElement = function(el){

		if(!this.ownerNode || !this.ownerNode.element) return;

		var o = this.ownerNode.element.querySelector('.selected');
		if(o){
			o.classList.remove("selected");
		}

		el.classList.add('selected');

	}
	this.createItem = function(){
		this.element = document.createElement('li');
		this.element.classList.add('list-item', 'exw-list-item');

		this.labelNode = document.createElement('span');
		this.labelNode.classList.add('name', 'icon');

		this.element.appendChild(this.labelNode);

		this.createCommon();
	};
	this.createFolder = function(){


		this.element = document.createElement('li');

		this.element = document.createElement('li');
		this.element.classList.add('list-nested-item', 'exw-list-item');

		this.labelNode = document.createElement('span');
		this.labelNode.classList.add('name', 'icon');

		var div = document.createElement('div');
		div.classList.add('list-item', 'header', 'exw-list-item-expandable');

		div.appendChild(this.labelNode);

		this.element.appendChild(div);

		this.listNode = document.createElement('ul');
		this.listNode.classList.add('list-tree', 'exw-list-tree' , 'has-collapsable-children');

		this.element.appendChild(this.listNode);

		if(this.isRoot){
			var root = document.createElement('ul');
			root.classList.add('list-tree', 'exw-list-tree-root', 'exw-list-tree' , 'has-collapsable-children');
			root.appendChild(this.element);

			this.element = root;
		}



		this.createCommon();

	};

	let cfgRequired = [
		{k:'type',v:'file'}, {k:'isFolder',v:false},{k:'isRoot',v:false},
		{k:'isExpanded',v: ((this.isFolder) ? true: false)},
		{k:'data',v:{}}
	];

	this.caption = (ops.caption === undefined) ? '' : ops.caption;
	this.icon = ops.icon;

	for(let fld of cfgRequired){
		if(!ops.hasOwnProperty(fld.k)){
			this[fld.k] = fld.v;
		}else{
			this[fld.k] = ops[fld.k];
		}
	}


	if(this.isFolder){
		this.createFolder();
	}else{
		this.createItem();
	}

	this.refresh();

	//console.log('list_created %o', this);

	return this;
} //end list


export default exwListTree;
