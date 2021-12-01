/*
Jose L Cuevas
https://exponentialworks.com
*/


const path = require('path');
const fs = require('fs');

const {util} = require('./util.js');
//#MARK CORE1



//console.log('self %o', self);
console.log('util %o', util);

var builder = {
	variables: {},
	init: function(){
		this.variables.pwd = process.cwd();
	},
	interpolate: function(tpl, data){
		var providers = Array.isArray(data) ? data : (data ? [data] : []);
		providers = providers.push(this.variables);

		var depth = 0;
		var out = '';
		var idx = 0;
		var value = function(n, ctx){

			var v = '';
			var scope = ctx;
			if(!n || n.length == 0) return '';

			if( n.match(/^([\+\-]?\d+(\.\d+)?)$/) ){
				return n;
			}
			if( n == "true" || n == "false" ){
				return n;
			}

			if( n == "%IDX%" ){
				return idx;
			}

			//support lang interpolation
			var m = n.match(/__\((.*?\))/);
			if( m && window.__){
				return __(m[1]);
			}

			//simple expressions
			n = n.replace(/(.+)\s+([\+\-\*\^\%\/])\s+(.+)/g, function(sIn, l,op, r, idx){
				var v1 = value(l, ctx);
				var v2 = value(r, ctx);
				v = eval("(" + v1 + op + v2 + ")");
				return "";
			});


			n = n.replace(/([a-zA-Z0-9\_]+)\./g, function(s1,entry, idx){
				//console.log("code in=[%s][%s]", s1, entry);
				scope = value(entry, scope);
				return "";
			});

			if(!n || n.length == 0) return v;
			if(!scope || typeof(scope)!= "object") return v;

			v = scope[n];
			if(!v) return '';
			if(typeof(v) == "function"){
				v = v.call(scope, n);
			}

			return v;
		};

		let _cache = {};
		let m, re = /({{(.*?)}})/g;

		while((m = re.exec(tpl))){
			console.log('MATCHED %s', m[0]);
			console.log('MATCHED CODE %s', m[2]);
			let code = m[1];
			if(_cache.hasOwnProperty(code)){
				tpl.replace(m[0], _cache[code]);
				return;
			}
			for (idx = 0; idx < providers.length; idx++) {
				depth++;
				console.log('PROVIDER: %d', idx);
				var ctx = (typeof providers[idx] == "object") ? providers[idx] : {};


			}
			depth--;
		}

		return tpl;

		for (idx = 0; idx < self.length; idx++) {
			var ctx = (typeof self[idx] == "object") ? self[idx] : {};

			out += tpl.replace(/({{(.*?)}})/g, function(s, placeholder,code, idx, t0){
				depth++;

				var v = '';

				v = value(code, ctx);

				if(v && typeof(v) == "object"){
					if(v.toString && (typeof(v.toString) == "function") ){
						v = v.toString();
					}else{
						v = "";
					}
				}

				console.log('REPLACE s=%s', s);
				console.log('CODE s=%s', code);
				return "" + v;
			});
		} // end for

		return out;

	}
}


var a = util.extend({name:"joe", v:10}, {name:"jose", lname: "cuevas"});
console.log(a);

builder.init();
console.log('variables %o', builder.variables);
var s= "{{pwd}}/dist/{{version}}/{{filename}}-{{version}}";
console.log('in %s=$s', s, builder.interpolate(s, {filename:"test.js"}));

console.log('RELATIVE %s', path.relative('/Library/WebServer/Documents', '/Library/WebServer/Documents/exc/test.html'));
var blueprint = {
	name: 'EXC',


};
