# exwCommandTerminal #
Courtesy of Jose Cuevas at [ExponentialWorks](https://exponetialworks.com)

This is a vanilla JS implementation of a command terminal that lets you emulate a shell in a browser.

The use-case for **exwCommandTerminal** is mainly to let users interact with your application using a *CLI* (Command Line Interface) that feels like using a Bash shell.



## Features ##
Implementation in a single function with no dependancies whatsoever. No *npm* packages, no NodeJS bindings, no JQuery or other frameworks, just vanilla JS!

Small, lost of features in a really small implementation.

Tested in Safari, Firefox, and Chrome. Should work with other *webkit* browsers.

Support [ANSI ESCAPE CODES](https://en.wikipedia.org/wiki/ANSI_escape_code#Escape_sequences) for formatting. It support most of the SGR (Select Graphic Rendition) options and will ignore unimplemented ones.

Basic BASH features to manage the shell interaction like history and many other commands.

Simple API to define and register your own commands.

Automatic argument parsing of the *command line*. Supports `-` (*short options*) and `--` (*long options*) arguments. An argument may have a value if followed by an `=` sign. Support for quoted strings with double or single quote that may include escape sequences.


## Limitations ##

This exwCommandTerminal is not a XTERM like solution like [xterm.js](https://github.com/xtermjs/xterm.js) which implements a full console able to support interactive shells (like ssh connections) or other interactive applications.

You can wrap an interactive application in a command as long as the application does not use ANSI escape sequences to move the cursor. For example in NodeJS you cYou can pipe the std-in



# Creating a  command terminal #


```js

let options = {

};

let term = new exwCommandTerminal(options);

document.querySelector('#target_selector').appendChild(term.getElement());
```

## Options ##

When creating an instance you may pass a plain object with options to configure your terminal. All options are *optional*...

| Option | Description |
| -- | -- |
| name | A human readable of a shell name or application name that you want to give to this terminal. It will be used when displaying errors and other messages. Default is "Shell". |
| targetSelector | A string with a valid selector pointing to the HTML element in the DOM where the terminal will be inserted as a child element. |
| class | A string with a css class name to be applied to the terminal element. |
| prompt | The prompt text. |
| promptSeparator | The prompt separator. |
| blinkInterval | An integer with the blink interval in milliseconds. |
| colors | An array of 16 basic colors used in a valid format supported by CSS. The colors from 0 to 7 are the base colors and 8-15 are the *bright* variation of the base colors. A palette of 256 colors is also created from these base colors. |
| styleColor | A string with a color in valid CSS format to be used as the default foreground color of formatted text by ANSI Escape Sequences. |
| styleBGColor | A string with a color in valid CSS format to be used as the default background color of formatted text by ANSI Escape Sequences. |
| commandPreflight | A function to be called to inspect and modify a command. The signature of this function is `function(term, cmd)`.<br><br>The argument `term` is the instance of `exwCommandTerminal`.<br><br>The argument `cmd` is an object representing the command line parsed. See the *CommandRegistry* section for more details.<br><br>This function must return true to indicate that the command should be processed. If it returns false or if does not return a value the command will be ignored. When ignoring a message it may return a string instead of false with a message to be displayed to the user.  |

## Register a command ##

```js
term.commandRegistry.add('version', (term, args)=>{
	term.write("Verion 1.0\n\tBy \u001b[34mExponential\u001b[32;1mWorks ");
});

```

## API ##

<hr>

`exwCommandTerminal.write(string)`

Writes output to the buffer. The string may contain [ANSI ESCAPE CODES](https://en.wikipedia.org/wiki/ANSI_escape_code#Escape_sequences). HTML entities will be ignored.

<hr>

`exwCommandTerminal.writeRaw(string)`

Similar to `write()` but HTML entities are respected.

<hr>

`exwCommandTerminal.clear()`

Clears the buffer.

<hr>

`exwCommandTerminal.focus()`

Sets the focus.

<hr>

`exwCommandTerminal.writeLn(string, opWithHTML)`

Writes a single line to the buffer. If `opWithHTML` is true HTML entities are respected else they are ignored.

<hr>

`exwCommandTerminal.setCommandText(string)`

Set the text that appears in the prompt as if entered by the user.

<hr>

`exwCommandTerminal.getElement()`

Returns the `HTMElement` of the terminal to be inserted in the DOM or for further manipulations.

<hr>

`exwCommandTerminal.setPrompt(newPrompt, newSeparator)`

Sets the prompt text. The string may include ANSI escape sequences. You may also specify a separator but it is optional. As a good citizen you must call `restorePrompt()` to put things back the way they were before.

<hr>

`exwCommandTerminal.restorePrompt()`

Restores the previous prompt text.


<hr>

`exwCommandTerminal.captureInput(prompt)`

 Request input from the user. The `prompt` string is the text shown to the user.

 This function returns a promise that will be resolved with the input provided by the user.

```js
terminal.captureInput('Enter Name: ').then((input) => {
	terminal.write('Hi, Your name is ' + input + '!');
}, ()=>{
	terminal.write('Ok, no need to be rude!');
});
```
<hr>

`exwCommandTerminal.releaseInput()`

Cancels a pending `captureInput()` request.


<hr>

## CommandRegistry ##

The commandRegistry manages the command that are available to the shell.

The `commandRegistry` is an object accessible as a property of the exwCommandTerminal instance.

A command is just a *callback* function that will be called when the command is invoked.

Use `commandRegistry.add(cmdName, cmdCallbackFn)` to register your command.

A callback function will receive two arguments, the first is the `exwCommandTerminal` instance and the second is a plain object with relevant information of the command invocation.

The signature of a callback function will be `function(cmd)`.  

The `cmd` parameter is a plain object with the following keys.

`cmd.verb` a string with the command name.

`cmd.raw` a string with the actual line as entered by user.

`cmd.params` an array of arguments passed.

The `cmd` object also implements some helper functions.

`cmd.hasArg(argName)` or `cmd.hasArg(argIndex)`  return a boolean indicating if the argument is present.

`cmd.getArg(argName, defaultValue)` or `cmd.getArg(argIndex, defaultValue)`  return the value of an argument if present, else it returns `defaultValue` or `undefined`.

`cmd.findArg(argName)` or `cmd.findArg(argIndex)`  return an integer with the position of the argument in the `params` array or `-1` if not found.


### Advance Commands ###


When registering a command you can provide an object instead. This allows to specify more options and implement more complex command with ease.

The execution of the command is implemented by a `run(cmd)` function on the object, it is the same as when registering a plain function.

As an object your command has a couple of helpers available in your `this` instance.

Call the `this.done()` function to tell the terminal that your command is finishing.

The property `this.terminal` points to the instance of the *exwCommandTerminal* running the command.


If you specify an `onInput(inputString)` function then your command will capture the input while is running or until you call `this.done()`. The `onInput()` will be called when the user provides an input and presses the return key.

> The `terminal.captureInput()` function is another alternative to get user input as needed.

If you set the properties `prompt` and `promptSeparator` the terminal will automatically change the prompt when `onInput()` is used.


If you specify an `onExit()` function, it will be called when your command ends. Use it to do any cleanup required.


### CTRL-C ###

To offer a familiar way to exit a command that is running interactively the CTRL-C keys are supported. If the user presses CTRL-C the `onExit()` will be executed on the command. Is up to the program to terminate its execution.

> CTRL-C will not abort the execution of a command or stop a runaway command or looped code.



### Note on arguments ###

A *short* option is an argument that starts with one hyphen`-` and is composed of a single letter, for example `-a`.

A *long* option is an argument that starts with two hyphens `--` and contains multiple characters, for example `--restart`.

A *short/long* option has a value if followed by an assignment with the `=` sign.

An example of an option with a value are:

`myCommand -n=jose` or `myCommand --msg="Welcome to my server"`

The value of `n` is `jose` and the value of `msg` is `Welcome to my server` (*notice no quotes on the value*).

> Space separated values for an option like `-n jose` are NOT supported.

When an option is not followed by an assignment its default value is the boolean *true*.

Multiple *short* options can be grouped in a single `-`. For example:
`myCommand -trK` has three options `t`, `r` and `K`.

The value of these grouped options is always the boolean *true* because there is no assignment.

In a group of *short* options you may assign a value to the last option on the group using an `=` assignment. For example `myCommand -trP=8080`. In this case `t` and `r` have a value of true and `P` has a value of `8080`.

For *short/long* options you may use the actual name or letter of the option to get is value. Lets see some examples:

For the command text `myCommand -n=jose`

```js
let myCommandFn = function(terminal, cmd){
	console.log('@My Command');
	console.log('Arguments are %o', cmd.params);

	let n = cmd.getArg('n'); //n is "jose"
};
```
For the command text `myCommand --fullname="Jose Cuevas"`
```js
let myCommandFn = function(terminal, cmd){
	console.log('@My Command');
	console.log('Arguments are %o', cmd.params);

	let name = cmd.getArg('fullname'); //name is "Jose Cuevas"
};
```

An argument that is not a *short/long* option becomes an indexed string in the params array. We say they are *indexed* because each is referenced by its position. Lets see some examples to see how it works:

In this command `myCommand 192.168.0.100`, the argument `192.168.0.100` is the first indexed parameter found and thus is assigned the index `0`. To access this argument we use `cmd.getArg()` with the index, for example:

```js
let ip = cmd.getArg(0);
```
Another example could be `myCommand 192.168.0.100 8080`, this command has two indexed arguments `192.168.0.100` and `8080`. The argument `192.168.0.100` is the index `0` and `8080` is in the index `1`.

```js
let ip = cmd.getArg(0);
let port = cmd.getArg(1);
```
Indexed arguments and *short/long* are treated separate, that is a *short/long* will not change the position of an indexed argument, the position will ignore *short/long* options.

For example in `myCommand -r 192.168.0.100 -t 8080 --name="Test Connection"` the indexed arguments `192.168.0.100` and `8080` are still at positions `0` and `1` respectively.
