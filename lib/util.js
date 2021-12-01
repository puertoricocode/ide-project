(function(root, factory){
	if (typeof exports === 'object') {
		factory(module.exports);
    } else {
        factory(root);
    }
}(typeof self !== 'undefined' ? self : this, function(exports){
	let toString = Object.prototype.toString;
	let hasOwn = Object.prototype.hasOwnProperty;
	let push = Array.prototype.push;
	let slice = Array.prototype.slice;
	let trim = String.prototype.trim;
	let indexOf = Array.prototype.indexOf;

	console.log(exports);
	var util = {
		type: function(obj){
			var class2type = {
				"[object Boolean]": "boolean", "[object Number]": "number","[object String]": "string","[object Function]": "function","[object Array]": "array",
				"[object Date]": "date","[object RegExp]": "regexp","[object Object]": "object"
			};
			return obj == null ? String(obj) : class2type[toString.call(obj)] || "object";
		},
		hasProperty: function($a, $n){
			return Object.prototype.hasOwnProperty.call($a, $n);
		},
		isKVP: function (obj) { //is key value store
			if (!obj || typeof(obj) !== "object" || obj.nodeType) {
				return false;
			}

			if(Array.isArray(obj)) return false;

			var key;
			for (key in obj) {}
			return key === undefined || hasOwn.call(obj, key);
		},
		is_callable: function (fn) {
			if(Array.isArray(fn)){
				if(typeof(fn[0]) != "object") return false;

				if((typeof(fn[1]) == 'string') && (typeof(fn[0][fn[1]]) == "function")) return true;
				if(typeof(fn[1]) == 'function') return true;

				return false;
			}

			if(typeof(fn) == "function") return true;
			return false;
		},
		is_array: function (obj) {
			return Array.isArray(obj);
		},
		isWindow: function (obj) {
			return obj != null && obj == obj.window;
		},
		is_numeric: function (obj) {
			return !isNaN(parseFloat(obj)) && isFinite(obj);
		},
		keys: function(a){
			let out = [];
			return Object.keys(a);
		},

		extend: function(){
			var st=1, options, name, src, copy, copyIsArray, clone ;
			var c = arguments.length, keys, k, b, a = arguments[0] || {};
			var deep = false;

			if(c <= 1) return (arguments[0] || undefined);

			if (typeof a !== "object" && !(this.type(a)=="function")) {
				a = {};
			}

			for(i = st; i < c; i++){
				if((b = arguments[i]) == null) continue;
				keys = this.keys(b);
				for(k of keys){
					copy = b[k];
	            	if (a === copy) continue;

					if (copy !== undefined) {
	              		a[k] = copy;
					}
				}
			}

			return a;
		}

	};


	exports.util = util;
}));
