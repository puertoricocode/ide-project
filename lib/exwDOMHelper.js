/*
EXC DOM Helper Library
https://exponentialworks.com/exc
Jose L Cuevas
Ver 1.0
*/


function init(){
	var d = document;

	if(!d) return null;

	var proto = {};
	var dom = {};
	var __injectedCSS = undefined;

	proto.getPosition = function(el){
		var r, o = {left: 0, top: 0, width: 0, height: 0 };
		if (el) {
			r = el.getBoundingClientRect();
			o.left = r.left + (window.pageXOffset || window.scrollX);
			o.top = r.top + (window.pageYOffset || window.scrollY);
			o.width = r.width;
			o.height = r.height;
		}
		return o;
	};
	proto.isOutOfViewport = function(a) {
		var r = element.getBoundingClientRect();
		var html = document.documentElement;

		// Check if it's out of the viewport on each side
		//https://gomakethings.com/how-to-check-if-any-part-of-an-element-is-out-of-the-viewport-with-vanilla-js/
		var out = {};
		out.top = r.top < 0;
		out.left = r.left < 0;
		out.bottom = r.bottom > (window.innerHeight || html.clientHeight);
		out.right = r.right > (window.innerWidth || html.clientWidth);
		out.any = out.top || out.left || out.bottom || out.right;
		out.all = out.top && out.left && out.bottom && out.right;

		return out;
	};
	proto.makeClickable = function(a, fn){
		//makes WAI compatible button, with mobile touch support
		a.__touchs = 0;
		var __called = false;
		a.addEventListener('touchstart', function () {
			__called = false;
           a.__touchs = 0;
        });
        a.addEventListener('touchmove', function () {
           a.__touchs = 1;
        });
        a.addEventListener('touchend', function (e) {
           if(a.__touchs == 0){
				e.preventDefault();
				__called = true;
                fn(e);
            }
			a.__touchs = 0;
        });

		 a.addEventListener('click', function (e) {
			if(!__called){
				fn(e);
			}
			__called = false;
		 });

		//aria, https://www.w3.org/TR/wai-aria-practices/examples/button/button.html
		a.addEventListener('keydown', function(e){
			if (e.keyCode === 32) {
			    e.preventDefault();
			}else if (e.keyCode === 13) {
				e.preventDefault();
				fn(e);
			}
		});

		a.addEventListener('keyup', function(e){
			if (e.keyCode === 32) {
				e.preventDefault();
				fn(e);
			}
		});

		a.setAttribute("tabindex", "0");
		a.setAttribute("role","button");

	};
	proto.createElement = function(s){
		var o;
		if(typeof(s) == "string"){
			if(s.substr(0,1) == "{"){
				s = JSON.parse(s);
			}else{
				return proto.htmlToNode(s);
			}
		}

		if(!s.type){
			o = d.createElement("div");
		}else if(s.type == "TEXT_NODE"){
			return d.createTextNode(s.textContent);
		}else{
			o = d.createElement(s.type);
		}

		if(s.attributes){
			if(s.attributes.hasOwnProperty("class")){
				var l = s.attributes["class"].trim();
				if(l.length){
					o.classList.add.apply(o.classList, l.split( /\s/ ));
				}
			}
			var aignore = ['class'];
			Object.keys(s.attributes).forEach(function(ak){
				if(aignore.indexOf(ak) >=0) return;
				o.setAttribute(ak, s.attributes[ak]);
			});
		}
		if(s.textContent){
			o.textContent = s.textContent;
		}

		if(s.hasOwnProperty("children") && Array.isArray(s.children) && s.children.length){
			s.children.forEach(function(c){
				var n = proto.createElement(c);
				if(n) o.appendChild(n);
			});
		}

		return o;
	};
	proto.toJSON = function(n){
		var o = {
			type: "",
			nodeType: 1,
			textContent: "",
			attributes: {},
			children: []
		};

		o.nodeType = n.nodeType;
		if(n.nodeType == 3){
			o.type = "TEXT_NODE";
			o.textContent = n.textContent;
		}else{
			o.type = n.tagName;
			//o.attributes = Array.from(e.attributes, function(value, key){ return [key, value]; }),
			if(n.hasAttributes()){
				var attrs = n.attributes;
				for (var i = 0; i < attrs.length; i++) {
                    o.attributes[attrs[i].name] = attrs[i].value;
                }
			}
			o.children = Array.from(n.children, proto.toJSON);
			if(!o.children.length){
				var s = n.textContent.trim();
				if(s.substr(0,1) == "{" && s.substr(-1,1) == "}"){
					try {
						o.data = JSON.parse(s);
					}catch(jerr){}
				}else{
					o.textContent = n.textContent;
				}
			}

			var wtc = ["A", "BUTTON", "SPAN", "OPTION", "LI", "B","I","H1","H2","H3","H4","SCRIPT","STYLE"];
			if(wtc.indexOf(o.type) >= 0){
				o.textContent = n.textContent;
			}else if(o.children.length == 1){
				if(o.children[0].type == "TEXT_NODE"){
					var c = o.children.pop();
					o.textContent = c.textContent;
				}
			}
		}
		return o;
	};
	proto.head = function(doc){
		var d = (doc ? doc : document);
		return document.head || document.getElementsByTagName('head')[0];
	};
	proto.inject = function(type, input) {
		var content = null;
		if (typeof input === 'string') {
			content = input;
		} else if (typeof input === 'function') {
			content = input.toString().
				replace(/^[^\/]+\/\*!?/, '').
				replace(/\*\/[^\/]+$/, '');
		}

		if (content == null) return undefined;

		var n = undefined;
		if(type == "css"){
			if (!__injectedCSS) {
				__injectedCSS = window.document.createElement('style');
				__injectedCSS.id = 'injectCSS';
				__injectedCSS.innerHTML = '';
				 document.getElementsByTagName("head")[0].appendChild(__injectedCSS);
			}

			n = __injectedCSS;
			__injectedCSS.innerHTML += '\n' + content;
		}else if(type == "html"){

			n = proto.htmlToNode(content, true);
			document.body.appendChild(n);

		}

		return n;
	};
	window.inject = proto.inject;




	function isCallback(fn){
		if(typeof fn == "function") return true;
		if(fn && Array.isArray(fn)){
			if( fn.length != 2) return false;
			if( !fn[0] || (typeof(fn[0]) != "object")) return false;
			return true;
		}

		return false;
	}
	function executeCallback(fn){
		var args = Array.prototype.slice.call(arguments, 1);

		if(fn && Array.isArray(fn)){
			var cfn = (typeof fn[1] === 'string') ? fn[0][fn[1]] : fn[1];
			return cfn.apply(fn[0], args);
		}else if(typeof fn == "function"){
			return fn.apply(fn, args);
		}
		return undefined;
	};

	function isString(obj){ return typeof obj == 'string';}
	function toString(any){
		var t = typeof(any);
		if(t == 'string') return any;
		if(t == "number") return any.toString(10);

		return "" + s;
	}
	function isCoercible(any){
		var t = typeof(any);
		if( (t == "string") || (t == "number") || (t == "boolean") ) return true;
		if(t == "object"){
			if( any instanceof Date) return true;
		}
		return false;
	}
	function toNode(any){ return proto.htmlToNode( toString(any) ); }
	function node(a){
		//helper, gets a node from input, accepts a node or selector
		if(!a) return null;
		if("string" === typeof(a)) return proto.get(a);
		if(1 === a.nodeType) return a;
		if(a && a.target && a.target.nodeType ) return a;
		if(!a || !a.nodeType) return null;

		if(1 == a.nodeType)  return a;


		if((11 == a.nodeType) || (9 == a.nodeType)) {
			return a.firstChild;
		}
		return null;
	}

	proto.parseHTML = function(a) {
		var tmp = document.implementation.createHTMLDocument();
		tmp.body.innerHTML = a;
		return tmp.body.children;
	};
	proto.htmlToNode = function(s, firstElement){ //returns documentFragment
		var rn = /<|&#?\w+;/;
		var rt = /<([a-z][^\/\0>\x20\t\r\n\f]*)/i;
		var ln = [];
		var f = document.createDocumentFragment();

		var containers = {
			option: [ 1, "<select multiple='multiple'>", "</select>" ],
			thead: [ 1, "<table>", "</table>" ],
			tfoot: [ 1, "<table>", "</table>" ],
			tr: [ 2, "<table><tbody>", "</tbody></table>" ],
			td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
			th: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
			any: [ 0, "", "" ]
		};

		var t, tag, container,n, i;
		if( (typeof(s) == "object") && s && s.nodeType){
			return s;
		}

		if(!rn.test(s)){
			ln.push( document.createTextNode(s) );
		}else{
			tag = (rt.exec(s) || ["","any"])[1].toLowerCase();
			container = containers.hasOwnProperty(tag) ? containers[tag] :  containers.any;

			t = document.createElement('div');
			t.innerHTML = container[1] + s + container[2];
			i = container[0];

			while(i--){
				t = t.lastChild;
			}
			for (i = 0; i < t.childNodes.length; i++) {
				ln.push(t.childNodes[i]);
			}
			t.textContent = "";
		}


		if(ln.length == 1) return ln[0];

		for (i = 0; i < ln.length; i++) {
			f.appendChild(ln[i]);
		}

		if(firstElement){
			var n = f.childNodes[0];
			while(n && n.nodeType != 1){
				n = f.childNodes[++i];
			}
			return n;
		}
		return f;
	};
	proto.nodeToHTML = function(a){
		if (!a) return "";
		var t = document.createElement('div');
		t.appendChild(a);
		return t.innerHTML;
	};

	//Query Selectors
	proto.isVisible = function(a){
		a = node(a);
		if(!a) return false;
		return !!( a.offsetWidth || a.offsetHeight || a.getClientRects().length );
	};
	proto.is = function( a, s ) {
		a = node(a);
		if(!a) return false;
		j = a && ( a.matches || a['webkitMatchesSelector'] || a['mozMatchesSelector'] || a['msMatchesSelector'] );
		return !!j && j.call( a, s );
	};
	proto.getAll = function(a,p){
		var o = p === []._ ? d : p;
		var l = [];
		var m = o.querySelectorAll(a);

		if( Object.prototype.toString.call( m ) === '[object NodeList]' ) {
			Array.prototype.push.apply(l, m );
		}else{
			Array.prototype.push.apply(l, m && m.nodeType ? [m] : ('' + m === m ? d.querySelectorAll(m) : []) );
		}
		return l;
	};
	proto.get = function(a, p){
		//Returns the first element matched
		//Will attempt to match a string against the name and id without a valid attribute selector syntax.
		var o = p === []._ ? d : p;
		var e;

		if(isString(a)){
			if(/([\.\#\[\:][a-z\d\-\_]+)|(\s?[\,\>\+\~]\s?)/i.test(a)){
				return o.querySelector(a);
			}
			if((e = o.querySelector("[name=\"" + a + "\"]"))) return e;
			if((e = o.querySelector("[id=\"" + a + "\"]"))) return e;
			return o.querySelector(a);
		}else if(a && a.nodeType){
			return a;
		}else if( a && a.target && a.target.nodeType ){
			return a.target;
		}
		return null;
	};
	proto.find = function(a, s){
		a = node(a);
		if(!a) return null;
		return proto.getAll(s, a);
	};
	proto.fromEvent = function(e, s){
		var a = proto.get(e);
		if(!a) return null;
		if(isString(s)){
			return proto.closest(a, s);
		}
		return a;
	};

	//Traversing...

	proto.closest = function(a, s) {
		/*
		get the first element that matches the selector by testing the element itself
		and traversing up through its ancestors in the DOM tree.
		*/
		a = node(a);
		if(!a) return null;

		var str = 0;
		var test = function(a, b) {
			j = a && ( a.matches || a['webkitMatchesSelector'] || a['mozMatchesSelector'] || a['msMatchesSelector'] );
			if( (typeof(b)== 'string') ) return j.call(a, b);
			return (a==b);
		};

		if(a && (typeof(s)== 'string') && a.closest ) return a.closest(s);

		var el = a;
		var ok;
		do {
			if(test(el, s)) return el;
			el = (el.parentNode ? el.parentNode : (el.parentElement ? el.parentElement : null));
		} while (el !== null && el.nodeType === 1);
		return null;
	};

	proto.parent = function(a, s) {
		a = node(a);
		if(!a) return null;
		var test = function(a, b) {
			j = a && ( a.matches || a['webkitMatchesSelector'] || a['mozMatchesSelector'] || a['msMatchesSelector'] );
			if( (typeof(b)== 'string') ) return j.call(a, b);
			return (a==b);
		};

		if(a && (typeof(s)== 'string') && a.closest ) return a.closest(s);

		var el = a.parentNode;
		var ok;
		do {
			if(test(el, s)) return el;
			el = el.parentElement || el.parentNode;
		} while (el !== null && el.nodeType === 1);
		return null;
	};
	proto.next = function(a, s){
		a = node(a);
		if(!a) return null;
		var o = a.nextSibling;
		while(o && 1 !== o.nodeType){
			o = o.nextSibling;
		}
		if(isString(s) && !proto.is(o,s)) return null;
		return o;
	};
	proto.previous = function(a, s){
		a = node(a);
		if(!a) return null;
		var o = a.previousSibling;
		while(o && 1 !== o.nodeType){
			o = o.previousSibling;
		}
		if(isString(s) && !proto.is(o,s)) return null;
		return o;
	};


	//Helpers
	proto.hasKey = function(a, n, v) {
		a = node(a);
		if(!a) return false;
		return a.hasAttribute("data-" + n);
	};
	proto.key = function(a, n, v) {
		a = node(a);
		if(!a) return null;
		var k = "data-" + n;
		return v === []._ ? a.getAttribute(k) : a.setAttribute(k, v);
	};
	proto.removeKey = function(a, n) {
		a = node(a);
		if(!a) return null;
		a.removeAttribute("data-" + n);
		return a;
	};
	proto.type = function(a){
		a = node(a);
		if(!a) return "";
		var t = "";
		var tag = a.nodeName.toLowerCase();
		if(tag == "input"){
			t = a.getAttribute("type");
			t = (!t) ? "text" : t.toLowerCase();
		}else if(tag == "div"){
			t = a.getAttribute("type");
			t = (!t) ? "text" : t.toLowerCase();
		}else{
			t = tag;
		}

		return t;
	};
	proto.tag = function(a){
		a = node(a);
		if(!a) return "";
		if(a.tagName) return a.tagName.toLowerCase();
		return "";
	};
	proto.name = function(a){
		a = node(a);
		if(!a) return "";

		if(a.hasAttribute("name")) return a.getAttribute("name");
		if(a.tagName) return a.tagName.toLowerCase();
		return "";
	};

	proto.prop = function(a, p, v) {
		a = node(a);
		if(!a) return null;

		p = ({'tabindex': 'tabIndex','readonly': 'readOnly','for': 'htmlFor','class': 'className', 'maxlength': 'maxLength','cellspacing': 'cellSpacing','cellpadding': 'cellPadding','rowspan': 'rowSpan','colspan': 'colSpan','usemap': 'useMap','frameborder': 'frameBorder','contenteditable': 'contentEditable'}[p] || p);
		var b = (['checked'].indexOf(p) >= 0) ? true : false;
		if(v === []._){
			v = a[p];
			v = ((v === []._) || (v == null)) ? 'undefined' : v;
			return v;
		}else{
			a[p] = v;
		}
		return a;
	};

	proto.val = function(a,v){
		a = node(a);
		if(!a) return undefined;
		var t =  proto.type(a,"type");

		if(v !== []._){
			if(t && ((t == 'checkbox') || (t == 'radio'))){
				if(typeof(v) == "boolean"){
					a.checked = v;
				}else{
					a.checked = (a.getAttribute("value") == v);
				}
			}else{
				a.value = v;
			}
			return a;
		}
		if(t && ((t == 'checkbox') || (t == 'radio'))){
			if(a.checked) return a.getAttribute("value");
		}else{
			return a.value;
		}
	};


	//Styling
	proto.hasClass = function(a, n) {
		a = node(a);
		if(!a) return false;
		return a.classList.contains(n);
	};
	proto.addClass = function(a, n) {
		a = node(a);
		if(!a) return null;
		if(!n || n.length == 0) return a;
		var cl = a.classList;
		cl.add.apply( cl, n.split( /\s/ ) );
		return a;
	};
	proto.removeClass = function(a, n) {
		a = node(a);
		if(!a) return null;
		var cl = a.classList;
		cl.remove.apply( cl, n.split( /\s/ ) );
		return a;
	};
	proto.toggleClass = function( a, n, b ) {
		a = node(a);
		if(!a) return null;
		var cl = a.classList;
		if( typeof b !== 'boolean' ) {
			b = !cl.contains( n );
		}
		cl[ b ? 'add' : 'remove' ].apply( cl, n.split( /\s/ ) );
		return a;
	};

	proto.camelCase = function(s){
		var v = s.replace(/-([a-z])/g, function( m, p ) { return p.toUpperCase(); } );
		v = v.replace(/(\s)/g, function(m, p){ return "-"; });
		return v;
	};
	proto.css = function(a, s, b) {
		a = node(a);
		if(!a) return null;
		if (typeof(s) === 'object') {
			for(var p in s) {
				a.style[p] = s[p];
			}
			return a;
		}
		if(b === []._){
			var st = window.getComputedStyle(a);
			return st[s];
		}
		a.style[s] = b;
		return a;
	};


	//Manipulation
	proto.text = function(a,v) {
		a = node(a);
		if(!a) return "";
		if(v === []._) return a.textContent;
		a.textContent = v;
		return a;
	};
	proto.html = function(a,v) {
		a = node(a);
		if(!a) return "";
		if(v === []._) return a.innerHTML;

		if(isCoercible(v)){
			a.innerHTML = proto.toString(v);
		}else if(v && v.nodeType){
			a.innerHTML = "";
			a.appendChild(v);
		}
		return a;
	};

	proto.append = function(a, h){
		a = node(a);
		if(!a) return null;
		if(!h) return a;
		if( isCoercible(h) ){
			a.appendChild( toNode(h) );
		}else{
			a.appendChild(h);
		}
		return a;
	};

	/*
		Insert content specified by the parameter h, to the beginning of a's inner html.
		h can be a an html string, and array of elements, or an element
	*/
	proto.prepend = function(a, h) {
		a = node(a);
		if(!a) return null;
		if(!h) return a;
		var t = a.firstChild;

		if(Array.isArray(h)){
			var v = document.createDocumentFragment();
			h.forEach(function(e){ v.appendChild(e); });
			a.insertBefore(v, t);
		}else if( isCoercible(h) ){
			a.insertBefore( toNode(h), t );
		}else{
			a.insertBefore(h, t);
		}
		return a;
	};

	/*
		Insert content specified by the parameter h, before the node a.
		h can be a an html string, and array of elements, or an element
	*/
	proto.before = function(a, h) {
		a = node(a);
		if(!a) return null;
		if(!h) return a;
		if(Array.isArray(h)){
			var v = document.createDocumentFragment();
			h.forEach(function(e){ v.appendChild(e); });
			a.insertAdjacentHTML('beforebegin', v);
		}else if(isCoercible(h)){
			a.insertAdjacentHTML('beforebegin',  toNode(h)  );
		}else{
			a.insertAdjacentHTML('beforebegin', h);
		}
		return a;
	};

	/*
		Insert content specified by the parameter h, after the node a.
		h can be a an html string, and array of elements, or an element
	*/
	proto.after = function(a, h) {
		a = node(a);
		if(!a) return null;
		if(!h) return a;

		var x = proto.next(a);
		var fn = function(b){ ///NST:IGNORE
			if(!x){
				a.parentNode.appendChild(b);
			} else {
				a.parentNode.insertBefore(b,x);
			}
		};

		if(Array.isArray(h)){
			var v = document.createDocumentFragment();
			h.forEach(function(e){ v.appendChild(e); });
			fn(v);
		}else if(isCoercible(h)){
			fn(toNode(h));
		}else{
			fn(h);
		}
		return a;
	};


	//Data
	//private data
	var _createPrivateData = function(n){
		return {observers:{'addedNodes':[],'removedNodes':[],'attributeChanged':[]}, events:{}, data:{}};
	};
	var _getPrivateData = function(a){
		if(!a.hasOwnProperty("_exc")){
			a._exc = _createPrivateData(a);
		}

		return a._exc;
	};

	proto.data = function(a, n, v) {
		a = node(a);
		if(!a) return null;
		var p = _getPrivateData(a);

		if(v === []._){
			if(p.data.hasOwnProperty(n)) return p.data[n];
			return undefined;
		}

		p.data[n] = v;
		return a;
	};
	proto.hasData = function(a, n) {
		a = node(a);
		if(!a) return false;
		var p = _getPrivateData(a);
		return p.data.hasOwnProperty(n);
	};

	//Events
	proto.trigger = function(a, evt, data) {
		a = node(a);
		if(!a) return false;

		var e;
		if(['change', 'blur', 'focus'].indexOf(evt) >= 0){
			e = new	Event(evt, {bubbles: true, cancelable: false, view: window});
		}else if(['click', 'dblclick', 'mouseup', 'mousedown', 'mouseover', 'mouseenter', 'mouseleave', 'mousemove'].indexOf(evt) >= 0){
			e = new	MouseEvent(evt,  {bubbles: true, cancelable: true, view: window});
		}else if(['wheel'].indexOf(evt) >= 0){
			e = new	WheelEvent(evt,  {bubbles: true, cancelable: true, view: window});
		}else{
			e = new	Event(evt, {bubbles: false, cancelable: false, view: window});
			if(e){
				e.data = data
			}
		}

		if(e){
			e.target = a;
			a.dispatchEvent(e);
		}
	}

	//Actions
	function actionCreate(o, evt){

		var action = {
			'type': evt,
			'o': o,
			'validation':[],
			'message':[],
			'handler':[],
			'done':[],
			execute: function(event){
				var i=0;
				var a = [];
				var ok = true;
				for(i=0; i<this.validation.length;i++){
					//console.log(this.validation[i]);
					a =[ this.validation[i].fn, event ];
					ok = this.callback.apply(this, a);
					if(!ok) break;
				}
				if(!ok){
					console.log("[EXC][PROTO.ACTION][" + this.type + "][Action terminated by validation. Handlers not executed.");
					return;
				}

				for(i=0; i<this.handler.length;i++){
					a =[ this.handler[i].fn, event ];
					this.callback.apply(this, a);
				}
				for(i=0; i<this.done.length;i++){
					a =[ this.done[i].fn, event ];
					this.callback.apply(this, a);
				}
			},
			callback: function(fn){
				var args = Array.prototype.slice.call(arguments, 1);
				if(fn && Array.isArray(fn)){
					var cfn = (typeof fn[1] === 'string') ? fn[0][fn[1]] : fn[1];
					return cfn.apply(fn[0], args);
				}else if(typeof fn == "function"){
					return fn.apply(fn, args);
				}
				return undefined;
			},
		};

		var fn = function(event){
			//event.preventDefault();
			//console.log("action.%s.execute() %o", evt, action);
			action.execute(event);
		};

		proto.data(o, "exc_action_" + evt, action);
		o.addEventListener(evt, fn);

		return action;
	}

	/*
		Adds an action
		An action is a modified event listener, that adds three stages to the event life

		The first stage is a "validation", handlers added to an event for a "validation" stage run before other handlers.
		All callbacks on the "validation" must return TRUE for handlers to be executed.

		If the validation is a success or if no validation handlers were set, then the "handler" stage is executed.
		This stage is your traditional event handler.

		Then comes the "done" stage here you add handlers that you need to run last, for example after dom is modified, values are set, etc.


		proto.onAction(elem, "click.validate()", function(event){ return true; } );

		//use a namespace to make it easier to remove or manipulate your action
		proto.onAction(elem, "click.mylib.validate()", function(event){ return true; } );


		proto.onAction(elem, "click.handler()", function(event){  } );
		proto.onAction(elem, "click.mylib.handler()", function(event){  } );
		proto.onAction(elem, "click.mylib", function(event){  } ); //similar to jquery

		proto.onAction(elem, "click.done()", function(event){  } );
		proto.onAction(elem, "click.mylib.done()", function(event){  } );
	*/
	proto.onAction =function(o, evt, fn){
		o = node(o);
		if(!o) return null;
		if(typeof(fn) != "function") return o;

		var def = { event:evt,name:'',handler:'handler'}; ///NST:IGNORE
		var ex = [
			{r: /^([a-z]+)\.([A-Za-z0-9\-\_]+)\.([a-z]+)\(\)$/i, fn:function(m){ return { event:m[1],name:m[2],handler:m[3]};}},  ///NST:IGNORE
			{r: /^([a-z]+)\.([a-z]+)\(\)$/i, fn:function(m){ return { event:m[1],name:'',handler:m[2]};}},  ///NST:IGNORE
			{r: /^([a-z]+)\.([A-Za-z0-9\-\_]+)$/i, fn:function(m){ return { event:m[1],name:m[2],handler:'handler'};}},  ///NST:IGNORE
		];
		for(var i=0; i<ex.length;i++){
			var er = ex[i];
			var m = er.r.exec(evt);
			if(!m) continue;
			def = er.fn(m);
			break;
		}

		//console.log("ON event:" + def.event + ", handler:" + def.handler + ", namespace:" + def.name );

		var a = proto.data(o, "exc_action_" + def.event);
		if(typeof(a) == "undefined"){
			a = actionCreate(o, def.event);
		}

		if(!a.hasOwnProperty(def.handler)) def.handler = 'handler';

		a[def.handler].push({'n':def.name,'fn':fn });

		return this;
	};
	proto.offAction =function(o, evt, fn){
		o = node(o);
		if(!o) return null;

		var def = { event:evt,name:'',handler:'handler'};
		var ex = [
			{r: /^([a-z]+)\.([A-Z|a-z|0-9|\-\_]+)\.([a-z]+)\(\)$/i, fn:function(m){ return { event:m[1],name:m[2],handler:m[3]};}},
			{r: /^([a-z]+)\.([a-z]+)\(\)$/i, fn:function(m){ return { event:m[1],name:'',handler:m[2]};}},
			{r: /^([a-z]+)\.([A-Z|a-z|0-9|\-\_]+)$/i, fn:function(m){ return { event:m[1],name:m[2],handler:'handler'};}},
		];
		for(var i=0; i<ex.length;i++){
			var er = ex[i];
			var m = er.r.exec(evt);
			if(!m) continue;
			def = er.fn(m);
			break;
		}

		//console.log("OFF event:" + def.event + ", handler:" + def.handler + ", namespace:" + def.name );

		var a = proto.data(o, "exc_action_" + def.event);
		if(typeof(a) == "undefined") return this;

		if(!a.hasOwnProperty(def.handler)) return this;

		for(i=0; i<a[def.handler].length;i++){
			var fe = a[def.handler][i];
			if( (def.name.length > 0) && (def.name == fe.n) ){
				a[def.handler].splice(i,1);
				break;
			}
			if( (typeof(fn) != "undefined" ) && (fn === fe.fn) ){
				a[def.handler].splice(i,1);
				break;
			}
		}

		return this;

	};
	proto.hasAction = function(o, def, fn){
		o = node(o);
		if(!o) return false;
		///def = {event:"click", name:"namespace"|"", handler:"validation"|"handler"}

		var a = proto.data(o, "exc_action_" + def.event);
		if(typeof(a) == "undefined") return false;

		if(!a.hasOwnProperty(def.handler)) return false;

		for(i=0; i<a[def.handler].length;i++){
			var fe = a[def.handler][i];
			if( (def.name.length > 0) && (def.name == fe.n) ){
				return true;
			}
			if( (typeof(fn) != "undefined" ) && (fn === fe.fn) ){
				return true;
			}
		}

		return false;

	};

	proto.getAction = function(o, evt){
		a = node(a);
		if(!a) return false;
		var a = proto.data(o, "exc_action_" + evt);
		return a;
	};


	//Node Pollution
	var nodeCopyFn = ["hasClass", "addClass","removeClass","css", "is", "prop", "val", "html", "text", "append", "find"];
	nodeCopyFn.forEach(function(n){ ///NST:MARK:Node.Prototype
		var fn = proto[n];
		Node.prototype[n] = function(){
			var args = [this]; Array.prototype.push.apply(args,arguments);
			return fn.apply(proto, args);
		};
	});


	var _loadCallbacks = [];
	function ready(fn){
		if (!isCallback(fn)) return;
        if (/loaded|complete|interactive/.test(d.readyState)) {
            // already ready
            window.setTimeout(function(){
				executeCallback(fn);
			}, 0);
        } else {
            _loadCallbacks.push(fn);
        }
    }

	d.addEventListener("DOMContentLoaded", function(event) {
		 for (var i = 0, l = _loadCallbacks.length; i < l; i++) { executeCallback(_loadCallbacks[i]); }
	});

	function decorate(a){
		Object.keys(proto).forEach(function(n){
			if(typeof(proto[n])!== "function") return;
			a[n] = function(){
				var args = [this]; Array.prototype.push.apply(args,arguments);
				return proto[n].apply(proto, args);
			};
		});
	};

	//decorate(dom);
	dom.decorate = decorate;

	dom.ready = ready;
	//allow extensions...
	//dom.extensions = proto;

	Object.setPrototypeOf(dom, proto);
	return dom;
};

module.exports = init();
