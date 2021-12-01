'use babel';

/*
Jose L Cuevas
https://exponentialworks.com
*/



function exwSelectList(ops){

	if(ops.elementForItem && (typeof(ops.elementForItem) != 'function')){
		ops.elementForItem = undefined;
	}
	if(!ops.hasOwnProperty('selectMultiple')) ops.selectMultiple = false;

	this.element = document.createElement('div');
	this.element.classList.add('exw-select-list', 'select-list');
	this.element.setAttribute('is', 'space-pen-div');

	let view = this.element;
	let _this = this;

	this.element.innerHTML = '<p class="info-message icon icon-browser" style="margin-top: 6px; margin-bottom: 6px;"></p><input class="exw-textbox-search input-search exw-textbox" type="search" placeholder="filter" tabindex="-1"><div class="exw-error-message" style="display: none;"><span class="exw-error-text"></span></div>';

	this.txtEditor = view.querySelector('.exw-textbox-search');
	this.titleNode = view.querySelector('p.info-message');

	this.errorNode = view.querySelector('.exw-error-message');
	this.errorSpanNode = view.querySelector('.exw-error-text');

	this.listNode = document.createElement('ol');
	this.listNode.classList.add('exw-select-list', 'list-group', 'native-key-bindings');
	this.listNode.setAttribute('tabindex', '-1');
	this.element.appendChild(this.listNode);

	this.loadingNode = document.createElement('div');
	this.loadingNode.classList.add('loading');
	this.loadingNode.setAttribute('style', 'margin-top: 6px;');
	this.loadingNode.innerHTML = '<span class="loading-message"></span>';
	this.loadingMsgNode = this.loadingNode.querySelector('.loading-message');
	this.element.appendChild(this.loadingNode);

	var fnOnDidConfirmSelection = function(selected){
		if(ops.didConfirmSelection){
			ops.didConfirmSelection(selected);
		}
	};
	var fnOnSelectionDblClick = function(selected){
		if(ops.didDblClickSelection){
			ops.didDblClickSelection(selected);
		}
	};
	var fnOnSelectionClick = function(selected){
		if(ops.didClickSelection){
			ops.didClickSelection(selected);
		}
	};
	var fnOnDidCancelSelection = function(){
		if(ops.didCancelSelection){
			ops.didCancelSelection();
		}
	};


	if(ops.title){
		this.titleNode.innerHTML = ops.title;
		if(ops.titleIcon){
			this.titleNode.classList.remove('icon-browser');
			this.titleNode.classList.add(ops.titleIcon);
		}
	}else{
		this.titleNode.style.display = 'none';
	}

	if(ops.loadingMessage){
		this.loadingMsgNode.innerHTML = ops.loadingMessage;
	}else{
		this.loadingNode.style.display = 'none';
	}

	if(ops.class){
		if(Array.isArray(ops.class)){
			for(let cn of ops.class) this.element.classList.add(cn);
		}else if(typeof(ops.class) === 'string'){
			this.element.classList.add(ops.class);
		}
	}

	let searching = false;
	this.txtEditor.addEventListener('input', (event) => {
		event.preventDefault();
		event.stopImmediatePropagation();
		if(searching) return;
		searching = true;
		this.filterItems(this.txtEditor.value);
		searching = false;
	});

	this.txtEditor.addEventListener('keydown', (event) => {
		if(event.code == 'Enter'){
			event.preventDefault();
			event.stopImmediatePropagation();

			this.confirmSelection();

		}else if(event.code == 'Escape'){
			event.preventDefault();
			event.stopImmediatePropagation();
			this.cancel();
		}else if(event.code == 'Tab'){
			event.preventDefault();
			event.stopImmediatePropagation();
			this.listNode.focus();
		}
	});

	this.listNode.addEventListener('keydown', (event) => {
		console.log('listNode.keydown(%s)', event.code);
		if(event.code == 'Enter'){
			event.preventDefault();
			event.stopImmediatePropagation();

			this.confirmSelection();
		}else if(event.code == 'Escape'){
			event.preventDefault();
			event.stopImmediatePropagation();
			this.cancel();
		}else if(event.code == 'Tab'){
			event.preventDefault();
			event.stopImmediatePropagation();
			this.txtEditor.focus();
		}else if(event.code == 'ArrowUp'){
			event.preventDefault();
			event.stopImmediatePropagation();
			this.selectPreviousItemView();
		}else if(event.code == 'ArrowDown'){
			event.preventDefault();
			event.stopImmediatePropagation();
			this.selectNextItemView();
		}
	});


	this.isShiftPressed = false;

	this.getElement = function(){
		return this.element;
	};
	this.setLoadingMessage = function(s){
		if (s == null) {
			s = '';
		}
		if (message.length === 0) {
			this.loadingMsgNode.textContent = '';
			this.loadingNode.style.display = 'none';
		} else {
			this.loadingMsgNode.textContent = s;
			this.loadingNode.style.display = 'block';
		}
		this.loadingMsgNode.innerHTML = s;
	};

	this.setError = function(s) {
		if (s == null) {
			s = '';
		}
		if (s.length === 0) {
			this.errorSpanNode.textContent = '';
			this.errorNode.style.display = 'none';
		} else {
			this.errorSpanNode.textContent = s;
			this.errorNode.style.display = 'block';
		}
    };

	this.scrollToItemView = function(item){
		var list = this.listNode;
		item.scrollIntoView();


    };

//Manage selection
	this.getSelectedItemView = function(){
		let o = this.listNode.querySelectorAll('li.selected');
		return Array.prototype.slice.call(o);
	};
	this.selectItemView = function(elm){

		var flgDeselect = true;
		if(ops.selectMultiple && this.isShiftPressed) flgDeselect = false;

		if(flgDeselect){
			let o = this.listNode.querySelectorAll('li.selected');
			for(let e of o){
				e.classList.remove('selected');
			}
		}

		elm.classList.add('selected');
	 	this.scrollToItemView(elm);
	};
	this.selectPreviousItemView = function(){
		let selected = this.getSelectedItemView();
		if(!selected.length){
			let last = this.listNode.querySelector('li:last-child');
			if(last) this.selectItemView(last);
		}else{
			let elm = selected[0].previousSibling;
			if(elm) this.selectItemView(elm);
		}
	};
	this.selectNextItemView = function(){
		let selected = this.getSelectedItemView();
		if(!selected.length){
			let first = this.listNode.querySelector('li:first-child');
			if(first) this.selectItemView(first);
		}else{
			let elm = selected[0].nextSibling;
			if(elm) this.selectItemView(elm);
		}
	};

//Filter items...
	this.filterItems = function(txt){
		if(!this.element) return;
		if(!this.listNode) return;


		let o = this.listNode.querySelectorAll('li.selected');
		for(let e of o){
			e.classList.remove('selected');
		}


		if(!txt){
			for(let elm of this.listNode.childNodes){
				elm.style.display = 'block';
			}
			return;
		}
		let matched = [];
		for(let elm of this.listNode.childNodes){
			let s = elm.innerHTML;
			s = s.replace(/(<([^>]+)>)/gi, " ").toLowerCase();
			//console.log('html=[%s]', s);
			if(s.indexOf(txt) < 0){
				elm.style.display = 'none';
			}else{
				elm.style.display = 'block';
				matched.push(elm);
			}
		}

		if(matched.length == 1){
			this.selectItemView(matched[0]);
		}
	};
	this.clear = function(){
		if(!this.element) return;
		if(!this.listNode) return;
		if(this.listNode.innerHTML) this.listNode.innerHTML = "";
	};
	this.cancel = function(){
		if(!ops.didCancelSelection || (typeof(ops.didCancelSelection) != 'function')){
			this.cancel();
		}
		fnOnDidCancelSelection();
	};
	this.confirmSelection = function(){

		this.txtEditor.value = '';

		let selected = this.getSelectedItemView();
		if(!selected || !selected.length) return;
		if(!ops.didConfirmSelection || (typeof(ops.didConfirmSelection) != 'function')){
			this.cancel();
		}


		fnOnDidConfirmSelection(selected);

	};
	this.setItems = function(items){
		this.clear();
		var _this = this;
		const closest = function(elm, sel){
			if(!elm) return null;

			do{
				if(elm.matches(sel)) return elm;
				elm = elm.parentElement || elm.parentNode;

			}while(elm && elm.nodeType == 1);

			return null;
		};
		for(let item of items){
			let elm = this.createElementForItem(item);
			if(!elm || !elm.nodeType) continue;

			elm.addEventListener('dblclick', (e)=>{
				e.preventDefault();
				e.stopImmediatePropagation();

				this.isShiftPressed = e.shiftKey;

				let elm = closest(e.target, 'li');
				if(elm) _this.selectItemView(elm);

				let selected = this.getSelectedItemView();
				if(selected.length){
					fnOnSelectionDblClick(selected);
				}
			});
			
			elm.addEventListener('mouseup', (e)=>{
				e.preventDefault();
				e.stopImmediatePropagation();

				this.isShiftPressed = e.shiftKey;

				let elm = closest(e.target, 'li');
				if(elm) _this.selectItemView(elm);
			});

			/*elm.addEventListener('mousedown1', (e)=>{
				e.preventDefault();
				e.stopImmediatePropagation();

				e.preventDefault();

				let elm = closest(e.target, 'li');
				if(elm) _this.confirmSelection(elm);
			});*/

			this.listNode.appendChild(elm);
		}
	};

	this.createElementForItem = function(item){

		if(ops.elementForItem){
			let e = ops.elementForItem(item);
			if(!e || !e.nodeType) return undefined;
			return e;
		}

		var caption = '';
		if(typeof(item) == 'string'){
			caption = item;
			item = {};
		}else if(item.title){
			caption = item.title;
		}

		let elm = document.createElement('li');
		elm.setAttribute('style','border-left: 4px inset transparent');
		elm.setAttribute('is', 'space-pen-li');

		var s;
		if(item.primaryLine){
			let p1 = document.createElement('div');
			p1.classList.add('primary-line');
			s = item.primaryLine;
			if(item.icon){
				s = '<div class="icon ' + item.icon + '" style="color: ">'  + s + '</div>';
			}else{
				s = '<div class="no-icon" style="color: ">'  + s + '</div>';
			}
			p1.innerHTML = s;
			elm.appendChild(p1);
			if(item.secondaryLine){
				let p2 = document.createElement('div');
				p2.classList.add('secondary-line');
				s = '<div class="no-icon" style="color: ">'  + item.secondaryLine + '</div>';
				p2.innerHTML = s;
				elm.appendChild(p2);
			}
		}else{
			if(item.icon){
				let iconNode = document.createElement('i');
				iconNode.classList.add('icon', item.icon);
				elm.appendChild(iconNode);
				let spanNode = document.createElement('span');
				spanNode.textContent = caption;
				elm.appendChild(spanNode);
			}else{
				elm.textContent = caption;
			}
		}

		if(item.data){
			for(let dk of Object.keys(item.data)){
				elm.setAttribute('data-' + dk, item.data[dk]);
			}
		}

		return elm;
	};

	this.focusFilterEditor = function(){
		this.txtEditor.focus();
	};








	return this;
};

export default exwSelectList;
