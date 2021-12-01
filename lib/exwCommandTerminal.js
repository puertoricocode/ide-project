'use babel';

/*
Jose L Cuevas
https://exponentialworks.com
*/

var _electron = require("electron");

function exwCommandTerminal(ops){

	this.items = [];
	var _term = this;

	this.state = {
		name: 'Shell',
		blinkInterval: 600,
		class:'',
		running: false,
		pipeInput: undefined,
		env: {},
		prompt: '%',
		promptSeparator: ' &gt;&nbsp;',
		history: [],
		styleDefault: {bold: false, italic: false, underline: false, strike:false, color: '#fff', bgcolor: '#222425', blink: false, css:[]},
		commandPreflight: null
	};

	let extendValues = [
		'name','blinkInterval','class', 'commandPreflight', 'prompt', 'promptSeparator'
	];
	for(let k of extendValues){
		if(ops.hasOwnProperty(k)) this.state[k] = ops[k];
	}

	if(ops.hasOwnProperty('styleColor')){
		this.styleDefault.color = ops.styleColor;
	}
	if(ops.hasOwnProperty('styleBGColor')){
		this.styleDefault.bgcolor = ops.styleBGColor;
	}

	let styleDefault = {bold: false, italic: false, underline: false, strike:false, color: '#fff', bgcolor: '#222425', blink: false, css:[]};

	if(ops && typeof(ops)=='object'){
		for(let sKey in styleDefault){
			if(ops.hasOwnProperty(sKey)) styleDefault[sKey] = ops[sKey];
		}
	}

	this.colors = {
		//Base Colors 0-7 are standard color, 8-15 are bright variants
		base: [
			'#2e3436','#cd3131','#0dbc79','#e5e510','#2472c8','#bc3fbc','#11a8cd','#d3d7cf',
			'#666666','#f14c4c','#23d18b','#f5f543','#3b8eea','#d670d6','#29b8dB','#eeeeec'
		],
		palette: [],
	};

	if(ops.hasOwnProperty('colors') && ops.colors.length==16){
		this.colors.base = ops.colors.slice();
	}

	this.colors.palette = (function (baseColors) {
	    var colors = baseColors.slice(), r = [0x00, 0x5f, 0x87, 0xaf, 0xd7, 0xff], i;
	    i = 0;
	    for (; i < 216; i++) {
	        out(r[(i / 36) % 6 | 0], r[(i / 6) % 6 | 0], r[i % 6]);
	    }
	    i = 0;
	    for (; i < 24; i++) {
	        r = 8 + i * 10;
	        out(r, r, r);
	    }
	    function out(r, g, b) {
	        colors.push('#' + hex(r) + hex(g) + hex(b));
	    }
	    function hex(c) {
	        c = c.toString(16);
	        return c.length < 2 ? '0' + c : c;
	    }
	    return colors;
	})(this.colors.base);


	let term = this;
	this.element = undefined;
	this.historyCursor = this.state.history.length;

	this.state.activeCommand = undefined;

	this.commandRegistry = {
		commands: {},
		add: function(cmd, obj) {
			let cmdImp;
			if(!obj){
				console.log('[EXW][TERMINAL] received an invalid implementation for a command for registration.');
				return;
			}

			if(typeof(obj) === 'function'){
				cmdImp = {
					run: function(cmd){
						console.log('@run wrapper');
						console.log(this);
						obj.call(this, cmd);
						this.done();
					}
				};
			}else{
				cmdImp = obj;
			}

			if(typeof(cmdImp.run) != 'function'){
				console.log('[EXW][TERMINAL] expects a command implementation to have a "run" function.');
				return;
			}
			cmdImp.terminal = undefined;
			cmdImp.enabled = true;
			cmdImp.verb = cmd;
			cmdImp.done = () =>{
				console.log('Running exit');
				term.closeActiveCommand();
			};

			if(cmdImp.onInput && typeof(cmdImp.onInput) != 'function'){
				cmdImp.onInput = undefined;
			}
			if(cmdImp.onExit && typeof(cmdImp.onExit) != 'function'){
				cmdImp.onExit = undefined;
			}

			if(!cmdImp.hasOwnProperty('prompt')){
				cmdImp.prompt = term.state.prompt;
			}
			if(!cmdImp.hasOwnProperty('promptSeparator')){
				cmdImp.promptSeparator = term.state.promptSeparator;
			}

			this.commands[cmd] = cmdImp;
		}
	};
	this.closeActiveCommand = function(){
		this.releaseInput();

		this.state.running = false;
		this.element.classList.remove('isBusy');

		if(!this.state.activeCommand) return;

		this.restorePrompt();

		if(this.state.activeCommand.onExit && typeof(this.state.activeCommand.onExit) == 'function'){
			this.state.activeCommand.onExit.apply(this.state.activeCommand, []);
		}
		this.state.activeCommand = undefined;
	}

	this.isCapturingInput = function(){
		return (this.state.pipeInput);
	};
	this.captureInput = function(prompt){

		if(this.state.pipeInput){
			this.state.pipeInput.clean();
			this.state.pipeInput.reject();
		}

		let rejected =
		this.state.pipeInput = {
			lastPrompt: this.state.prompt,
			lastPromptSeparator: this.state.promptSeparator,
			prompt: prompt,
			promise: undefined,
			reject:undefined,
			resolve:undefined,
			clean: () => {
				if(this.state.pipeInput.prompt){
					this.promptNode.innerHTML = this.state.pipeInput.lastPrompt + this.state.pipeInput.lastPromptSeparator;
					this.syncDisplayCursor();
				}
			}
		};

		if(prompt){
			let s1 = this.processVT100(prompt);
			this.promptNode.innerHTML = s1;
			this.syncDisplayCursor();
		}

		this.state.pipeInput.promise = new Promise((resolve, reject) => {
  			this.state.pipeInput.reject = reject;
			this.state.pipeInput.resolve = resolve;
		});

		return this.state.pipeInput.promise;
	};
	this.releaseInput = function(){
		if(this.state.pipeInput){
			this.state.pipeInput.clean();
			this.state.pipeInput.reject();
		}

		this.state.pipeInput = undefined;
	};
	this.runCommand = (cmdCode, cmd) => {
		let cleanUp = () =>{
			this.state.running = false;
			this.element.classList.remove('isBusy');
		};

		if(cmdCode == 'clear'){
			this.clear();
			return;
		}
		this.state.running = true;
		if(!this.commandRegistry.commands.hasOwnProperty(cmdCode)){
			atom.beep();
			this.write(this.state.name + ': command not found...');
			cleanUp();
			return;
		}

		let e = this.commandRegistry.commands[cmdCode];
		if(!e.run){
			cleanUp();
			return;
		}

		this.element.classList.add('isBusy');

		e.terminal = this;
		e.command = cmd;
		this.state.activeCommand = e;

		if(e.onInput && (typeof(e.onInput) == "function")){
			this.setPrompt(e.prompt, e.promptSeparator);
			//this.captureInput((input) => {
			//	e.onInput(input);
			//});
		}

		window.setTimeout(()=>{
			e.run.apply(e, [cmd.params]);
			cleanUp();
		}, 5);

	};
	this.processInput = (cmdIn) => {

		if(this.state.pipeInput){
			this.state.pipeInput.clean();
			this.state.pipeInput.resolve(cmdIn);
			this.state.pipeInput = undefined;

			return;
		}

		if(this.state.activeCommand && this.state.activeCommand.onInput){
			this.state.activeCommand.onInput.apply(this.state.activeCommand, [cmdIn]);
			return;
		}

		let scmd = cmdIn.trim();
		this.state.history.push(scmd);
		this.historyCursor = this.state.history.length;


		//console.log(scmd);
		this.echoCommand(scmd);
		var cmd = this.parseCommand(scmd);


		if(this.state.commandPreflight){
			let r = this.state.commandPreflight(this, cmd);
			if(typeof(r) == 'string'){
				this.write(r);
				return;
			}else if(r !== true){
				this.write(this.state.name + ': command not found...');
				return;
			}
		}

		console.log(cmd);
		let cmdCode = cmd.verb.toLowerCase();
		this.runCommand(cmdCode, cmd);
	};


	this.focus = function () {
    	return this.commandNode.focus();
	};



	this.build = () => {
		this.element = document.createElement('div');
		this.element.classList.add('exw-terminal');
		if(this.state.class) this.element.classList.add(this.state.class);

		this.element.innerHTML = '<div class="exw-terminal-container"></div><div class="exw-terminal-footer"><div class="exw-terminal-msg"></div><div class="exw-terminal-busy"><svg viewBox="0 0 64 64"><g stroke-width="4" stroke-linecap="round"><line y1="12" y2="20" transform="translate(32,32) rotate(180)"><animate attributeName="stroke-opacity" dur="750ms" values="1;.85;.7;.65;.55;.45;.35;.25;.15;.1;0;1" repeatCount="indefinite"></animate></line><line y1="12" y2="20" transform="translate(32,32) rotate(210)"><animate attributeName="stroke-opacity" dur="750ms" values="0;1;.85;.7;.65;.55;.45;.35;.25;.15;.1;0" repeatCount="indefinite"></animate></line><line y1="12" y2="20" transform="translate(32,32) rotate(240)"><animate attributeName="stroke-opacity" dur="750ms" values=".1;0;1;.85;.7;.65;.55;.45;.35;.25;.15;.1" repeatCount="indefinite"></animate></line><line y1="12" y2="20" transform="translate(32,32) rotate(270)"><animate attributeName="stroke-opacity" dur="750ms" values=".15;.1;0;1;.85;.7;.65;.55;.45;.35;.25;.15" repeatCount="indefinite"></animate></line><line y1="12" y2="20" transform="translate(32,32) rotate(300)"><animate attributeName="stroke-opacity" dur="750ms" values=".25;.15;.1;0;1;.85;.7;.65;.55;.45;.35;.25" repeatCount="indefinite"></animate></line><line y1="12" y2="20" transform="translate(32,32) rotate(330)"><animate attributeName="stroke-opacity" dur="750ms" values=".35;.25;.15;.1;0;1;.85;.7;.65;.55;.45;.35" repeatCount="indefinite"></animate></line><line y1="12" y2="20" transform="translate(32,32) rotate(0)"><animate attributeName="stroke-opacity" dur="750ms" values=".45;.35;.25;.15;.1;0;1;.85;.7;.65;.55;.45" repeatCount="indefinite"></animate></line><line y1="12" y2="20" transform="translate(32,32) rotate(30)"><animate attributeName="stroke-opacity" dur="750ms" values=".55;.45;.35;.25;.15;.1;0;1;.85;.7;.65;.55" repeatCount="indefinite"></animate></line><line y1="12" y2="20" transform="translate(32,32) rotate(60)"><animate attributeName="stroke-opacity" dur="750ms" values=".65;.55;.45;.35;.25;.15;.1;0;1;.85;.7;.65" repeatCount="indefinite"></animate></line><line y1="12" y2="20" transform="translate(32,32) rotate(90)"><animate attributeName="stroke-opacity" dur="750ms" values=".7;.65;.55;.45;.35;.25;.15;.1;0;1;.85;.7" repeatCount="indefinite"></animate></line><line y1="12" y2="20" transform="translate(32,32) rotate(120)"><animate attributeName="stroke-opacity" dur="750ms" values=".85;.7;.65;.55;.45;.35;.25;.15;.1;0;1;.85" repeatCount="indefinite"></animate></line><line y1="12" y2="20" transform="translate(32,32) rotate(150)"><animate attributeName="stroke-opacity" dur="750ms" values="1;.85;.7;.65;.55;.45;.35;.25;.15;.1;0;1" repeatCount="indefinite"></animate></line></g></svg></div>';

		this.msgNode = this.element.querySelector('.exw-terminal-msg');
		this.busyNode = this.element.querySelector('.exw-terminal-busy');
		this.footerNode = this.element.querySelector('.exw-terminal-footer');
		this.containerNode = this.element.querySelector('.exw-terminal-container');

		this.containerNode.innerHTML = '<div class="exw-terminal-prompt"><textarea autocapitalize="none" autocomplete="off" autocorrect="off" autofocus="true" spellcheck="false" rows="1" cols="30" id="exw-terminal-txt" aria-label="Terminal input" tabindex="-1"></textarea><div class="prompt"></div><div class="command-input"><i class="b c">&nbsp;</i></div></div><div class="exw-terminal-buffer"></div>';

		this.bufferNode = this.containerNode.querySelector('.exw-terminal-buffer');
		this.promptBarNode = this.containerNode.querySelector('.exw-terminal-prompt');
		this.promptNode = this.promptBarNode.querySelector('.prompt');
		this.commandNode = this.promptBarNode.querySelector('.command-input');

		this.textarea = this.promptBarNode.querySelector('#exw-terminal-txt');
		//this.textarea.classList.add('exw-textbox');

		this.textarea.addEventListener('keydown', function(event){
			_term.handleKeyDown(event);
		});
		this.textarea.addEventListener('keyup',function(event){
			let keyCode = event.code;
			if(keyCode == 'ArrowLeft' || keyCode == 'ArrowRight'){
				_term.syncDisplayCursor();
			}
		});

		this.textarea.addEventListener('input',function(event){
			_term.syncText();
		});
	    this.textarea.addEventListener('focus', function(event){

	    });
	    this.textarea.addEventListener('blur', function(event){

	    });


		this.cs = { //to track command prompt mouse events
			mouseDown: false,
			mouseMoved: false,
			firstCh: null,
		};
		this.commandNode.addEventListener('mousedown',function(event){
			_term.cs.mouseDown = true;
			_term.cs.mouseMove = false;
			_term.cs.firstCh = null;

			let co = event.target;
			if(co.nodeName != 'I') return;
			_term.cs.firstCh = co;
		});

		this.commandNode.addEventListener('mousemove',function(event){

			if(_term.cs.mouseDown){
				_term.cs.mouseMove = true;
			}

		});

		_term.commandNode.addEventListener('mouseup',function(event){
			let co = event.target;
			//console.log('char=%s %o',co.nodeName,  co);
			if(co.nodeName != 'I'){
				_term.textarea.focus();
				return;
			}

			let s1, s2, dif = -1;
			s1 = s2 = co.__idx
			if(_term.cs.mouseMove){
				let dif = _term.cs.firstCh.__idx - co.__idx;
				if(dif != 0){
					s2 = Math.max(co.__idx, _term.cs.firstCh.__idx);
					s1 = Math.min(co.__idx, _term.cs.firstCh.__idx);
				}
			}

			_term.textarea.selectionStart = s1;
			_term.textarea.selectionEnd = s2;
			_term.syncDisplayCursor();

			_term.cs.mouseDown = true;
			_term.cs.mouseMove = false;
			_term.cs.firstCh = null;
			_term.textarea.focus();
		});

		this.promptNode.addEventListener("click", function(event){
			_term.textarea.focus();
		});

		this.element.addEventListener('focus', function(event){
			_term.textarea.focus();
		});
	};
	this.findRangeForNode = function(node){
		let sel = document.getSelection();
		for(let i = 0; i < sel.rangeCount; i++){
			let range = sel.getRangeAt(i);
			if(range.intersectsNode(node)) return range;
		}

		return undefined;
	};
	this.syncText = function(){
		let s = this.textarea.value;
		this.commandNode.innerHTML = '';


	    var s1 = this.textarea.selectionStart;
		var s2 = this.textarea.selectionEnd;
		//console.log('S=%d, E=%d', s1,s2);

	    let i, co, span = document.createElement('i');

		for (i = 0; i < s.length; i++) {

			co = span.cloneNode();
	        co.textContent = s.charAt(i);
			co.__idx = i;
	        if(s1 == s2 && i == s1){
	        	co.classList.add('c');
	        }else if(s1 == i){
	        	co.classList.add('s1');
	        }else if(s2 == i){
	        	co.classList.add('s2');
			}else if(i >= s1 && i <= s2){
	        	co.classList.add('s');
			}

	        this.commandNode.appendChild(co);
	    }

		co = span.cloneNode();
        co.innerHTML = '&nbsp;';
		co.__idx = s.length;

		co.classList.add('b');
		if(s1 == s2 && i == s1){
        	co.classList.add('c');
        }else if(s1 == i){
        	co.classList.add('s1');
        }else if(s2 == i){
        	co.classList.add('s2');
		}
		this.commandNode.appendChild(co);

	};
	this.syncTxtCursor = function(){
		let txt = this.textarea;
		let div = this.promptBarNode;
		let stdIn = this.commandNode;

		let sel = document.getSelection();
		if(sel.rangeCount === 0) return;
		let range = this.findRangeForNode(stdIn);
		if(!range){
			console.log('sorry no sel on stdIn');
			return;
		}

		var s1 = range.startOffset;
		var s2 = range.endOffset;

		let d;
		let sRect = stdIn.getBoundingClientRect();
		let by = sRect.top;
		let bx = sRect.left;

		let cRect = this.cursorNode.getBoundingClientRect()
	  	let ch = cRect.height;
	  	let cw = cRect.width;

		let rect = range.getBoundingClientRect();

		let sx = rect.right;
		let sy = rect.top;

		console.log('BX=%d RIGHT=%d', bx, sx);
		console.log('BY=%d TOP=%d', by, sy);


		d = (sy > by) ? Math.round((sy - by)/ch) : 0;
		ct = ch * d;

		d = (sx > bx) ? Math.round((sx - bx)/cw) : 0;
		cl = cw * d;

		if(ct == 0){
			cl += this.promptNode.getBoundingClientRect().width;
		}

		this.cursorNode.style.top = ct + 'px';
		this.cursorNode.style.left = cl + 'px';


		sel.removeAllRanges();
		txt.focus();

		range = document.createRange();
		let tn = (txt.textContent.length == 0) ? txt : txt.firstChild;

		if(s1==0){
			range.selectNode(tn);
			range.collapse(true);
		}else{
			range.setStart(tn, (s1) ? s1-1 : s1);
			range.setEnd(tn, s2);
		}
		sel.addRange(range);

		console.log('S1=%d S2=%d', s1, s2);

	};
	this.syncDisplayCursor = function(){
		var s1 = this.textarea.selectionStart;
		var s2 = this.textarea.selectionEnd;
		console.log('syncDisplayCursor S=%d, E=%d', s1,s2);

		let chars = this.commandNode.querySelectorAll('i');
		for(var i=0; i<chars.length; i++){
			let co = chars[i];

			co.classList.remove('c', 's', 's1', 's2');
	        if(s1 == s2 && i == s1){
	        	co.classList.add('c');
	        }else if(s1 == i){
	        	co.classList.add('s1');
	        }else if(s2 == i){
	        	co.classList.add('s2', 'c');
			}else if(i >= s1 && i <= s2){
	        	co.classList.add('s');
			}
		}
	};
	this.getElement = () => {
		return this.element;
	};
	this.processVT100 = (sIn) => {

		//https://en.wikipedia.org/wiki/ANSI_escape_code#Escape_sequences
		//https://notes.burke.libbey.me/ansi-escape-codes/
		//http://ascii-table.com/ansi-escape-sequences-vt-100.php
		//http://ascii-table.com/documents/vt100/chapter3.php#S3.3.3

		//Parses CSI (Control Sequence Introducer) sequences

		let out = '', pos = -1, lastCH = '', ch = '';

		let nextChar = () => {
			if(pos+1 >= sIn.length ) return false;
			lastCH = ch;
			ch = sIn.charAt(++pos);

			return ch;
		};
		let pokeChar = () => {
			if(pos+1 >= sIn.length ) return false;
			return sIn.charAt(pos+1);
		};
		let putBack = () => {
			ch = lastCH;
			pos--;
		};

		let styleCount = 0;
		//styleDefault = {bold: false, italic: false, underline: false, strike:false, color: '#fff', bgcolor: '#222425', blink: false, css:[]};
		styleDefault = this.state.styleDefault;

		let styleLast = styleDefault;

		let styleInherit = (idx) => {
			let style = {};
			for(let sKey in styleLast){
				if(sKey == 'css'){
					style.css = styleLast.css.splice();
					continue;
				}
				style[sKey] = styleLast[sKey];

			}
			return style;
		};
		let styleEmmit = (style) => {
			if(styleCount>0){
				out += '</span>';
			}
			styleCount++;
			styleLast = style;

			let o = [];
			let css = [];

			o.push('color:' + style.color + ';');
			o.push('background-color:' + style.bgcolor + ';');

			if(style.bold){
				css.push('f-b-y');
			}else{
				css.push('f-b-n');
			}

			if(style.italic){
				css.push('f-i-y');
			}else{
				css.push('f-i-n');
			}

			if(style.blink){
				css.push('f-blink-y');
			}else{
				css.push('f-blink-n');
			}

			if(style.strike){
				css.push('f-td-st');
			}
			if(style.underline){
				css.push('f-td-u');
			}

			for(let s of style.css){
				if(css.indexOf(s) >= 0) continue;
				css.push(s);
			}

			let classes ='';
			if(css.length){
				classes = ' class="' + css.join(' ') + '"';
			}

			let s = '<span style="' + o.join(' ') + '"' + classes + '>';

			out += s;
		};


		let fnSGR = (args) => {
			let crgb = (r,g, b) => {
				return '#' + hex(r) + hex(g) + hex(b);
				function hex(c) {
			        c = c.toString(16);
			        return c.length < 2 ? '0' + c : c;
			    }
			}
			let style;
			if(args.indexOf(0) >= 0){
				if(styleCount > 0){
					//out += '</span>';
					styleEmmit(styleDefault);
					styleCount--;
				}
			}

			style = styleInherit();



			for(let i = 0; i<args.length; i++){
				let a = args[i];
				if(a == 5 || a == 6){
					style.blink = true;
				}else if(a == 1){
					style.bold = true;
				}else if(a == 3){
					style.italic = true;
				}else if(a == 4){
					style.underline = true;
				}else if(a == 9){
					style.strike = true;
				}else if(a == 39){
					style.color = term.styleDefault.color;
				}else if(a == 49){
					style.bgcolor = term.styleDefault.bgcolor;
				}else if(/3[0-7]/.test('' +a)){ //color 30-37
					style.color = term.colors.base[a-30];
				}else if(/4[0-7]/.test('' +a)){ //bg color 40-47
					style.bgcolor = term.colors.base[8 + a-40];
				}else if(/9[0-7]/.test('' +a)){ //bright color 90-97
					style.color = term.colors.base[8 + a-90];
				}else if(/10[0-7]/.test('' +a)){ //bright bg color 100-107
					style.bgcolor = term.colors.base[8+ a-100];
				}else if( (a == 38 || a == 48) && args.length >= 3){
					let color_rgb;
					if(args[i+1] == 5){ //is a color form 256 palette
						color_rgb = term.colors.palette[args[i+2]];
						i+=2;
					}else if(args[i+1] == 2){ // build from r,g,b
						color_rgb = crgb(args[i+2],args[i+3],args[i+4]);
						i+=4;
					}
					if(a==48){
						style.bgcolor = color_rgb;
					}else{
						style.color = color_rgb;
					}
				}
			}

			styleEmmit(style);
		};


		while(nextChar() !== false){

			let operations = [];
			let digit = '';
			let args = [];
			let ansiFn = '';
			let rewindPos = pos - 1;
			if(ch === "\u001b" || ch === "\x1b"){
				do{
				 	if(!pokeChar() == '['){
						out += ch;
						putBack();
						break;
					}
					nextChar();
					//capture args
					do{
						nextChar();
						if(ch === false) break;
						if(/[0-9]/.test(ch)){
							digit += ch;
						}else if(ch == '?'){
							if(digit){
								args.push(Number.parseInt(digit,10));
								digit = '';
							}
							args.push('?')
						}else if(ch == ';' || ch == ':'){
							if(digit){
								args.push(Number.parseInt(digit,10));
								digit = '';
							}
							if(pokeChar() == ';'){
								args.push(0);
								nextChar();
							}
						}else{
							if(digit){
								args.push(Number.parseInt(digit,10));
								digit = '';
							}
							break;
						}
					}while(true);

					if(/[A–Za-z\^|_\~\@]/.test(ch)){
						operations.push({fn:ch, args:args.slice()});
					}
				}while(ch === "\u001b" || ch === "\x1b");

				for(let op of operations){
					//console.log('ANSI ESC CODE %o', op);
					if(op.fn == 'm'){
						fnSGR(op.args);
					}
				}
			}else if(ch == ' '){
				out += '&nbsp';
			}else{
				out += ch;
			}

		}

		if(styleCount){
			out += '</span>';
		}

		return out;
	};

	this.convertUnicode = (s) => {
		let unicode = '';
		do{
			let m = /\\u(([0-9A-Fa-f]{2}){2})/g.exec(s);
			if(!m) break;

		}while(m);
	};

	this.parseCommand = (sIn) => {
		let pos = -1, lastCH = '', ch = '', args = [];
		let nextChar = () => {
			if(pos+1 >= sIn.length ) return false;
			lastCH = ch;
			ch = sIn.charAt(++pos);

			return ch;
		};
		let pokeChar = () => {
			if(pos+1 >= sIn.length ) return false;
			return sIn.charAt(pos+1);
		};
		let putBack = () => {
			ch = lastCH;
			pos--;
		};
		let readQuoted = (del) => {
			let s = '';
			while((nextChar() !== false)){
				if(ch == '\\'){
					let nch = pokeChar();
					if(nch == del || nch == '\\' || nch == "'" || nch == '"'){
						s += nch;
						nextChar();
					}else if(nch == 'u' || nch == 'U'){ //assume unicode
						//todo handle unicode...
						let ut = nch, unicode = '', restorePos = pos + 1;
						nextChar();
						do{
							nextChar(); //skip
							if(ch === false) break;
							if(!/[0-9A-Fa-f]/.test(ch)){
								putBack();
								break;
							}
							unicode += ch;
						}while(unicode.length < 4 && nch !== false);

						if(unicode.length != 4){
							s += '\\' + ut; pos = restorePos;
							continue;
						}
						try {
							s += JSON.parse('"' + "\\" + ut + unicode + '"');
						}catch(err){}
					}else{
						switch (nch) {
							case 't':
								nextChar();
								s += "\t"; break;
							case 'n':
								nextChar();
								s += "\n"; break;
							case 'r':
								nextChar();
								s += "\n"; break;
							default:
								s += ch;
						}
					}
					continue;

					//end quoted
				}else if(ch == del){
					break;
				}else{
					s += ch;
				}
			}//end while
			return s;
		};



		let nextToken = () => {
			let word = '';
			const splitChars = [' ', "\r","\n","\t","\v"];
			while(nextChar() !== false){
				if(ch == "'" || ch == '"'){
					word = readQuoted(ch);
					return word;
				}else if(ch == '='){
                    if(word){
                        putBack();
                        return word;
                    }else{
    					return ch;
                    }
				}else if( splitChars.indexOf(ch) >= 0){
					do{
						nextChar();
						if(ch === false) break;
						if(splitChars.indexOf(ch)<0){
							putBack();
							break;
						}
					}while(true);

					if(word) return word;
				}else{
					word += ch;
				}
			}
			return word;
		};


		let cmd =nextToken();

		let parseState = 0, arg = '', argv = '';
		do{

			let token = nextToken();
			if(!token){
				if(arg){ //save arg
					args.push({arg:arg, value:true});
				}
				break;
			}
			if(token.substr(0,2) == '--'){
				if(parseState == 1 && arg){
					args.push({arg:arg, value:true});
				}
				parseState = 1;
				token = token.substr(2);
				arg = token;
			}else if(token.substr(0,1) == '-'){
				if(parseState == 1 && arg){
					args.push({arg:arg, value:true});
				}

				parseState = 1;
				token = token.substr(1);
				for(let i=0; i< token.length; i++){
					arg = token.charAt(i);
					if(i < token.length-1){
						args.push({arg:arg, value:true});
					}
				}
			}else if(parseState == 1 ){
				if(token === '='){
					parseState = 2
				}else{
					parseState = 0
					if(arg){
						args.push({arg:arg, value:true});
						arg = '';
					}
					args.push(token);
				}
			}else if(parseState == 2){
				parseState = 0
				if(arg){
					args.push({arg:arg, value:token});
					arg = '';
				}

			}else{
				parseState = 0
				args.push(token);
			}
		}while(true);

		let out = {verb: cmd, params: args, raw: sIn };
		out.findArg = function(n){

			let idx = -1, e;
			for(let i=0; i<this.params.length; i++){
				e = this.params[i];
				let t = typeof(e);
				if( t == 'string'){
					idx++;
					if(n === idx) return i;
				}else if(t == 'object' && e){
					if(e.arg == n) return i;
				}
			}

			return -1;
		};
		out.hasArg = function(n){
			let idx = this.findArg(n);
			return (idx >= 0) ? true : false;
		};
		out.getArg = function(n, dValue){
			let idx = this.findArg(n);
			if(idx < 0) return dValue;
			let e = this.params[idx];
			let t = typeof(e);
			if( t == 'string') return e;
			if(t == 'object' && e) return e.value;
			
			return dValue;
		};
		return out;
	};
	this.write = (s) => {
		let lines =	s.split(/\n/);
		for(let ln of lines){
			this.writeLn(ln, false);
		}
	};
	this.writeRaw = (s) => {
		let lines =	s.split(/\n/);
		for(let ln of lines){
			this.writeLn(ln, true);
		}
	};
	this.writeLn = (s, opSafe) => {

		if(!opSafe){
			s = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
		}
		let sout = this.processVT100(s);


		let out = document.createElement('div');
		out.classList.add('std-out');
		out.innerHTML = sout;

		this.bufferNode.appendChild(out);

		out.scrollIntoView();

	};


	let lastPrompt = ['%',' &gt; '];
	this.restorePrompt = function(){

		this.state.prompt = lastPrompt[0];
		this.state.promptSeparator = lastPrompt[1];

		let s = this.state.prompt + this.state.promptSeparator;
		this.promptNode.innerHTML = s;
		this.syncDisplayCursor();
	};
	this.setPrompt = function(s1, s2){
		lastPrompt[0] = this.state.prompt;
		lastPrompt[1] = this.state.promptSeparator;

		this.state.prompt = this.processVT100(s1);
		if(s2!== undefined){
			this.state.promptSeparator = s2;
		}
		this.promptNode.innerHTML = this.state.prompt + this.state.promptSeparator;
		this.syncDisplayCursor();
	};
	this.setCommandText = (s) => {
		this.textarea.value = s;
		this.syncText();
	};


	this.clear = function(){
		this.bufferNode.innerHTML = '';
	};
	this.echoCommand = (s) => {

		let span = document.createElement('span');
		span.classList.add('std-out-prompt');
		span.textContent = s;

		let out = document.createElement('div');
		out.classList.add('std-out');

		let prefix = '<span>' + this.state.prompt + this.state.promptSeparator + '</span>';
		out.innerHTML = prefix;

		out.appendChild(span);

		this.bufferNode.appendChild(out);

		out.scrollIntoView();

	};




	this.setStatusText = (s) => {
		this.msgNode.textContent = s;
	};
	this.setStatusHTML = (s) => {
		this.msgNode.innerHTML = s;
	};


	//wait to run next command
	let commandsYielding = [];
	this.pushCommand = (s) => {
		if(this.state.running){
			commandsYielding.push(s);
			return;
		}

		this.setCommandText('');
		this.processInput(s);
	};

	let processTimer;
	this.processTick = () => {
		if(!this.state.running){
			if(commandsYielding.length > 0){
				let s = commandsYielding.pop();
				this.setCommandText('');
				this.processInput(s);
			}
		}

		processTimer = setTimeout(() => {
			this.processTick();
		}, 600);
	};

	this.run = (runOps) => {
		if(runOps){
			if(runOps.env){
				this.state.env = runOps.env;
			}
		}

		processTimer = setTimeout(() => {
			this.processTick();
		}, 600);
	};

	this.handleKeyDown = (event) => {
		let keyCode = event.code;

		if (keyCode == 'KeyC' && event.ctrlKey){

			this.closeActiveCommand();
		}

		if(keyCode == 'Enter'){
			event.preventDefault();
			event.stopImmediatePropagation();
			if(this.state.running) return;
			let s = this.textarea.value;
			this.pushCommand(s);

			return;
		}else if(keyCode == 'ArrowUp' || keyCode == 'ArrowDown'){
			event.preventDefault();
			event.stopImmediatePropagation();
			let dir = (keyCode == 'ArrowUp') ? -1 : 1;
			this.historyCursor += dir;
			if(this.historyCursor < 0 || (this.historyCursor >= this.state.history.length)){
				if(dir){
					this.historyCursor = this.state.history.length;
					this.setCommandText('');
				}else{
					this.historyCursor = this.state.history.length;
					return;
				}
			}
			console.log('hc=%d', this.historyCursor)
			this.setCommandText(this.state.history[this.historyCursor]);
     	}
	}


	this.build();
	this.setPrompt(this.state.prompt);



	return this;
}

if (typeof module === 'object' && module.exports) {
	module.exports = exwCommandTerminal;
}
