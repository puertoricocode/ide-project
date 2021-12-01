'use babel';

/*
Jose L Cuevas
https://exponentialworks.com
*/


const fs = require('fs');
const path = require('path');


function exwFileStore(ops){

	let typeJSON = 1;
	let typeJS = 2;
	let typeDATA = 3;
	this.type = typeJSON;

	this.type = (ops.isJSON) ? typeJSON : this.type;
	this.type = (ops.isJS) ? typeJS : this.type;
	this.type = (ops.isData) ? typeDATA : this.type;

	if(!ops.path){
		this.fileName = (ops.fileName) ? ops.fileName: 'data.json';
		this.filedir = (ops.filePath) ? ops.filePath : atom.getConfigDirPath();

		this.path = path.join(this.filedir, this.fileName);
	}else{
		this.path = ops.path;
	}

	//this.file = new File(this.path)

	this.data = ops.defaults ? ops.defaults : {};

	this.disposed = false;
	this.dispose = function(){
		if(this.disposed) return;
		this.disposed = true;
		this.data = null;
		if(this.fileWatcher) this.fileWatcher.close();
	};
	this.destroy = function(){
		this.data = null;
		if(this.fileWatcher) this.fileWatcher.close();
	};

	this.toString = function(){
		return JSON.stringify(this.data, null, 4);
	};
	this.read = function(){
		try {
			this.data = fs.readFileSync(this.path, 'utf8');
			if(this.type == typeJSON){
				this.data = JSON.parse(this.data);
			}
		} catch(error) {
			console.log(error);
			return;
		}
	};
	this.save = function(){
		fs.writeFileSync(this.path,
			((this.type == typeJSON) ? JSON.stringify(this.data, null, 4) : this.data)
		);
		return this;
	};

	this.get = function(key) {
		if(this.type == typeJSON){
			if(!this.data.hasOwnProperty(key)) return undefined;
    		return this.data[key];
		}else{
			return this.data;
		}
  	};
	this.append = function(s){
		if(this.type != typeJSON){
			this.data += s;
		}
	}
	this.set = function(key, val){
		if(this.type == typeJSON){
    		this.data[key] = val;
		}else{
			this.data = key;
		}
		return this;
  	};
	this.watch = function(callback) {
    	if(this.fileWatcher) {
      		this.fileWatcher.close();
    	}

		try {
			this.fileWatcher = fs.watch(this.path, () => {
				this.read();
				if(callback) callback(this);
			});
		} catch (error) {
			console.log(error);
		}

		return this;
  	};

	fs.exists(this.path, (exists) => {
		if (exists) {
			this.read();
		} else {
			this.save();
		}
    });
}

export default exwFileStore;
