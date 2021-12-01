'use babel';

/*
Jose L Cuevas
https://exponentialworks.com
*/


const { TextEditor, File, Directory } = require('atom');

function replaceAll(string, search, replace) {
  return string.split(search).join(replace);
}

var exwModule = {
	name: 'TOOLS',
	group: null,
	ide: null,
	tools: {
		_isVirgin: true,
		items: null,
		hooks: {
			onSave: []
		},
	},
	initialize: function(ide){
		this.ide = ide;

		this.group = ide.ui.treeView.createGroup({
			name: 'TOOLS',
		});

		this.tools.items = new Map();

		this.loadTools();
	},
	loadTools: function(){
		let ide = this.ide;
		let configFolder = new Directory(ide.pathUserData);
		var toolsFolder = configFolder.getSubdirectory('exw-ide-tools');

		console.log("[EXW-IDE] Loading Tools from %s", toolsFolder.getPath());

		toolsFolder.exists().then(exist =>{
			if(!exist) return;
			toolsFolder.getEntries((err, files)=>{
				for(var i=0; i<files.length; i++){
					var file = files[i];
					if(file.isDirectory()) continue;
					this.toolAdd(file);
				}
			});
		});


		if(exwModule.group){
			updateToolsTree();
		}
	},
	toolAdd: function(file){
		let ide = this.ide;
		let tools = this.tools;

		if(!tools) return;

		if(!file) return;
		if(!file.isFile()) return;

		const pathTool = file.getPath();
		const fileName = file.getBaseName();
		const ext = fileName.substr(fileName.lastIndexOf('.') + 1);
		if(ext != "js") return;

		console.log("Loading Tool %s", pathTool);

		var uid = replaceAll(replaceAll(fileName.replace('.js',''),' ','-'),'_','-').toLowerCase();

		if(tools.hasOwnProperty(uid)){
			let suid = uid;
			var i = 1;
			uid = suid + '-' + i.toString();
			while(tools.hasOwnProperty(uid)){
				i++;
				uid = suid + '-' + i.toString();
			}
		}


		let buildToolEntry = function(tool){
			let s = tool.title ? tool.title : uid;
			var ideTool = {
				__uid: uid, __title: s, __source_path: pathTool, __source_file: fileName,
				srcAction: '',
			};

			var src = "var tool = {\n";
			if(tool.onAction && (typeof(tool.onAction) == 'function')){
				src += 'onAction:' + tool.onAction.toString() + ",\n";
			}else{
				src += "onAction: function(){},\n";
			}

			if(tool.onSave && (typeof(tool.onSave) == 'function')){
				tools.hooks.onSave.push(uid);
				src += 'onSave:' + tool.onSave.toString() + ",\n";
			}

			src += "\n};\n";

			ideTool.jscode = src;

			//console.log('Adding Tool %o', ideTool);
			tools.items.set(uid,ideTool);

			let cmd_uid = 'exw-ide:tool-' + uid;
			let cmdDef = {};
			cmdDef[cmd_uid] = (event) => {
				console.log('command event %o', event);
				toolRunWithUID(uid);
			};

			ide.disposables.add(atom.commands.add('atom-workspace', cmdDef));

			if(tool.isTextEditorContextMenu){
				let mnuDef = {label: ideTool.__title, command: cmd_uid};
				var mnu = atom.contextMenu.add({"atom-text-editor":[mnuDef]});
			}


			updateToolsTree();
		};

		file.read().then(function(code){
			var ctx = ide.controller.getScriptContext();
			ctx.tool = undefined;

			ide.runJS(code, ctx, fileName);

			if(!ctx.tool || typeof(ctx.tool) != 'object' ) return;
			buildToolEntry(ctx.tool);
		});
	}
};




function toolRunWithUID(uid, hook){
	let tools = exwModule.tools;
	let ide = exwModule.ide;

	if(!tools) return;
	if(!tools.items.has(uid)) return;
	var tool = tools.items.get(uid);

	if(!hook)  hook = 'onAction';

	console.log("[EXW-IDE] Running tool %s with hook %s", uid, hook);

	var src = tool.jscode;
	src += "\ntool." + hook + "();\n";

	var ctx = ide.controller.getScriptContext();

	let busyMsg, busyUsed = false;
	if(ide.busySignal){
		busySignal = ide.busySignal;
		busyMsg = ide.busySignal.reportBusy('Running ' + tool.__title + "...");
	};

	ctx.ide.script = {
		name: tool.__title,
		path: tool.__source_path,
		busyState: function(msg){
			if(msg === false){
				if(busyMsg){
					busyUsed = false;
					busyMsg.dispose();
				}
				return;
			}
			if(busyMsg){
				busyUsed = true;
				busyMsg.setTitle(msg);
			}
		},
		setBusyMessage: function(msg){
			if(busyMsg){
				busyUsed = true;
				busyMsg.setTitle(msg);
			}
		},
	};

	ide.runJS(src, ctx, tool.__source_file);
	if(!busyUsed){
		if(busyMsg) busyMsg.dispose();
	}
}
function updateToolsTree(){

	if(!exwModule.group) return;
	if(!exwModule.tools) return;

	let tools = exwModule.tools;
	let list = exwModule.group.container;
	let ide = exwModule.ide;

	list.innerHTML = "";

	//atom.commands.dispatch(prj.view.element, 'exw-ide:open-project');
	//atom.commands.dispatch(prj.view.element, 'exw-ide:save-project');

	let createTool = (tool) => {
		let uid = tool.__uid;
		let path = tool.__source_path;
		let listItem = document.createElement('li');
		listItem.classList.add('file', 'list-item', 'exw-tool-item');
		listItem.setAttribute('is', 'exw-tool-script');

		let btnEdit = document.createElement('button');
		btnEdit.classList.add('edit-script-file');
		btnEdit.addEventListener("click", (event)=> {
			console.log("edit doc path %s", path);
			atom.workspace.open(path);
		});

		listItem.appendChild(btnEdit);

		let listItemName = document.createElement('span');
		listItemName.classList.add('name', 'icon', 'icon-tools');
		listItemName.setAttribute('data-uid', uid);
		listItemName.setAttribute('data-name', tool.__title);
		listItemName.setAttribute('data-path', tool.__source_path);
		listItemName.setAttribute('title', tool.__source_path);
		listItemName.textContent = tool.__title;
		listItemName.addEventListener("dblclick", (event)=> {
			toolRunWithUID(uid);
		});

		listItem.appendChild(listItemName);

		list.appendChild(listItem);
	};


	/*
	list.append(new exwListTree({
		type: "tool", caption: 'PHP Functions...', icon: 'icon-rocket',
		isRoot: false,
		isFolder: false,
		isExpanded: false,
		attr: {alt: 'PHP Functions...', id: 'exw-ide-tool-cmd-fn-php', 'class': ['exw-ide-tool']},
		data: { uid: 'cmd-open-php-fn' },
		onAction: (listItem, event) => {
			ide.dispatchCommand('exw-ide:show-docs');
		},
	}));
	*/

	for([uid, tool] of tools.items){
		createTool(tool);
	}

	console.log('tools refreshed...');

}

export default exwModule;
