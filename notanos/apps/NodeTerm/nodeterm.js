var HeadlessTerminal = require('headless-terminal')
var ScreenBuffer = require("screen-buffer");
var net= require('net');
var fs= require('fs');
var es= require('event-stream');
var pty= require('pty.js');
var path= require('path');

var socketPath=process.env.WEBSESSION;
var scriptPath=path.dirname(process.argv[1]);

var naosConnection=net.connect(socketPath,handleWebConnect);


var terminal = new HeadlessTerminal(80, 30);
var remoteExpectation = terminal.displayBuffer.clone();

var shell;

function handleTerminalEvent(e) {
	switch (e.kind) {
		case "resize":
			shell.resize(e.columns,e.rows);
			terminal.resize(e.columns,e.rows);
		break;
		
		case "input":
			shell.write(e.data);
		break;
	}
}

terminal.on("change", function (buffer){
	var diff = ScreenBuffer.diff(remoteExpectation,buffer);
	var diffString=JSON.stringify(diff);
	//console.log(diffString);
	naosConnection.write(diffString+"\n");
	ScreenBuffer.patch(remoteExpectation,diff);
	});


function handleWebConnect() {
    var frame=fs.readFileSync(scriptPath+"/ttyframe.html");
    var header={"protocol":"processframe", "frameContent": frame.toString('base64')};
    naosConnection.write(JSON.stringify(header)+"\n");
    shell= pty.spawn('bash', [], {
		name: 'xterm-color',
		cols: 80,
		rows: 30,
		cwd: process.env.HOME,
		env: process.env
	});
    shell.on("data", function(data) { 
	    terminal.write(data) 
	});
	  naosConnection.pipe(es.split('\n')).on("data",function(data) {
			var ob=JSON.parse(data);
		  handleTerminalEvent(ob);
		});
	  
    //naosConnection.on("data",function(data) {shell.write(data)});
    setInterval(ticker,1000);
}

naosConnection.on('close',  function() {process.exit()});

function ticker() {
	//shell.write('whoami\r')
}
	
