'use babel';

/*
Jose L Cuevas
https://exponentialworks.com
*/

const path = require('path');
const fs = require('fs');
const exec = require('child_process');

const { TextEditor, File, Directory } = require('atom');

var provider = {
	ide: null,
	selector: '.source.php',
	disableForSelector: '.source.php .comment',
	inclusionPriority: 1,
  	excludeLowerPriority: true,
	lastPath: '',
	userSuggestions: null,
	staticSuggestions: { variables: [], keywords: [], constants: [], functions: [] },

	initialize: function(ide){
		this.ide = ide;

		fs.readFile( path.resolve(__dirname, 'php', 'completions.json'), (error, content) => {
			try {
				this.staticSuggestions = JSON.parse(content);

			} catch (e) {

			}
		});


		fs.readFile( path.resolve(__dirname, 'php', 'functions.json'), (error, content) => {
			try {
				this.staticSuggestions.functions = [];
				let data = JSON.parse(content);
				for( let item of data.functions ){
					this.staticSuggestions.functions.push(item);
				}

			} catch (e) {

			}
		});
	},
	dispose: function(){

	},
	getSuggestions: function(request){
		/*
		upgradedOptions = {
		editor: TextEditor //options.editor,
		prefix: "s" //options.prefix,
		activatedManually: undefined,
		bufferPosition: {row: 9, column: 6} //Point object //options.bufferPosition,
		scope: options.scopeDescriptor {
			scopes: [
				'text.html.php', 'source.php', 'meta.embedded.block.php', 'constant.other.php'
			]
		},
		scopeChain: options.scopeDescriptor.getScopeChain(),
		buffer: options.editor.getBuffer(),
		cursor: options.editor.getLastCursor()
		}
		*/

		//console.log("@php provider");
		//console.log(request);
		return new Promise( (resolve, reject) => {

			let context = { vars: false, constants: false, keywords: false, functions: false };

			if( !this.isAutocompleteContext(request) ){
				resolve([]);
				return;
			}else if( this.isAllContext(request) ){
				context.vars = context.constants = context.keywords = context.functions = true;
				this.parsePHP(request);
				resolve(this.getCompletions(request, context));
			}else if( this.isVariableContext(request) ){
				context.vars = true;
				this.parsePHP(request);
				resolve(this.getCompletions(request, context));
			}else if( this.isFunConContext(request) ){
				context.functions = true;
				this.parsePHP(request);
				resolve(this.getCompletions(request, context));
			}else{
				resolve([]);
			}
		});
	},
	isAutocompleteContext: function(request){
		if( request.prefix == '' ) return false;

    	let scopes = request.scopeDescriptor.getScopesArray();
		if( scopes.indexOf('keyword.operator.assignment.php') > -1 ||
			scopes.indexOf('keyword.operator.comparison.php') > -1 ||
			scopes.indexOf('keyword.operator.logical.php') > -1 ||
			scopes.indexOf('string.quoted.double.php') > -1 ||
			scopes.indexOf('string.quoted.single.php') > -1
		) return false;

		if( this.isStringContext(request) && this.isFunConContext(request) ) return false;
		return true;

	},
	isStringContext: function(request){
		let scopes = request.scopeDescriptor.getScopesArray();
		if( scopes.indexOf('string.quoted.double.php') > -1 ||
			scopes.indexOf('string.quoted.single.php') > -1
		) return true;
		return false;
	},
	isAllContext: function(request){
		let scopes = request.scopeDescriptor.getScopesArray();
		if( scopes.length == 3 ) return true;
		if( scopes.indexOf('meta.array.php') > -1 ) return true;
		return false;
	},
	isVariableContext: function(request){
		let scopes = request.scopeDescriptor.getScopesArray();
		if( scopes.indexOf('variable.other.php') > -1 ) return true;
		return false;
	},
	isFunConContext: function(request){
		let scopes = request.scopeDescriptor.getScopesArray();
		if( scopes.indexOf('constant.other.php') > -1 ||
			scopes.indexOf('keyword.control.php') > -1 ||
			scopes.indexOf('storage.type.php') > -1 ||
			scopes.indexOf('support.function.construct.php') > -1
		) return true;
		return false;
	},
	buildSuggestionEntry: function(entry){
		var o = {
    		text: entry.text,
    		type: entry.type,
    		displayText: entry.displayText ? entry.displayText : null,
			snippet: entry.snippet ? entry.snippet : null,
			leftLabel: entry.leftLabel ? entry.leftLabel : null,
    		description: entry.description ? entry.description: 'PHP ' + entry.text + ' ' + entry.type,
    		descriptionMoreURL: entry.descriptionMoreURL ? entry.descriptionMoreURL : null,
		};
		return o;
	},
	getCompletions: function(request, context){
		var completions = [];
		let lowerCasePrefix = request.prefix.toLowerCase();

		var pool = [];
		if( this.userSuggestions ){
			if( context.vars ){
				pool = pool.concat(this.userSuggestions.user_vars);
			}
			if( context.functions ){
				pool = pool.concat(this.userSuggestions.user_functions);
			}
		}
		if( this.staticSuggestions ){
			if( context.vars ){
				pool = pool.concat(this.staticSuggestions.variables);
			}
			if( context.functions ){
				pool = pool.concat(this.staticSuggestions.functions);
			}
			if( context.keywords ){
				pool = pool.concat(this.staticSuggestions.keywords);
			}
			if( context.constants ){
				pool = pool.concat(this.staticSuggestions.constants);
			}
		}

		for( const item of pool ){
			if( !item || !item.hasOwnProperty('text') ) continue;
			if( item.text.toLowerCase().indexOf(lowerCasePrefix) !== 0 ) continue;
			completions.push( this.buildSuggestionEntry(item) );
		}

		//console.log('completions=%o', completions);

		return completions;
	},
	parsePHP: function( request ){
		let editor = request.editor;
		const phpScript = 'get_user_all.php'
		let proc = exec.spawn( exwModule.executablePath, [__dirname + '/php/' + phpScript] );

		var output = '';
		let path = (editor.getPath() || '');

		if( this.lastPath != path ){
			this.userSuggestions = null;
		}

		this.lastPath = path;

		proc.stdin.write(editor.getText());
		proc.stdin.end();

		proc.stdout.on('data', (data) => {
			output = output + data;
		});

		proc.stderr.on('data', (data) => {
			console.log('[EXW-IDE] PHP Autocomplete Error: ' + data);
		});

		proc.on('close', (code) => {
			try {
				let o = JSON.parse(output);
				this.userSuggestions = o;
			} catch (e) {

			}
		});


	}
}

var exwModule = {
	name: 'ACPHP',
	ide: null,
	autocomplete: null,
	executablePath: 'php',
	initialize: function(ide){
		this.ide = ide;

		if( ide.config ){
			if( !ide.config.data.hasOwnProperty('php_executable_path') ){
				ide.config.set('php_executable_path', 'php');
				ide.config.save();
			}else{
				this.executablePath = ide.config.get('php_executable_path');
			}
		}

		var autocomplete = atom.packages.getActivePackage('autocomplete-plus');
		if(!autocomplete) return;
		if(!autocomplete.mainModule) return;
		console.log(autocomplete.mainModule);
		this.autocomplete = autocomplete.mainModule;


		provider.initialize(ide);

		this.autocomplete.consumeProvider(provider, 4);
	},
};


export default exwModule;
