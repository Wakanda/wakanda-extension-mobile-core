var Base64 = require("base64");
var shell = require("shellWorker");

var bash_profile = {};
if(! os.isWindows) {
    bash_profile.file = process.env.HOME + '/.bash_profile';
    try {
        bash_profile.exists = File(bash_profile.file).exists;
    } catch(e) {
        bash_profile.exists = false;
        studio.log('Error after checking user .bash_profile, error : ' + e);
    }
}

function getMessageString(options) {
    "use strict";

	var message = {
		msg: options.message,
		type: options.type || null,
		category: options.category || 'env'
    };
	return 'wakanda-extension-mobile-console.append.' + Base64.encode(JSON.stringify(message));
}

function printConsole(obj) {
    "use strict";
    
    studio.sendCommand(getMessageString(obj));
}

function getSelectedProjectPath() {
    "use strict";

    var projects = studio.getSelectedProjects();
    if(projects.length === 1) {
        return projects[0].split('/').slice(0, -1).join('/') + '/mobile';
    }
}

function getSelectedProjectName() {
    "use strict";

    var projects = studio.getSelectedProjects();
    if(projects.length === 1) {
        var path = projects[0].split('/').pop();
        return path.replace('.waProject', '');
    }
}

function stringifyFunc(obj) {
    "use strict";

    return JSON.stringify(obj, function(key, value) {
        return (typeof value === 'function') ? value.toString() : value;
    });
}

function getAvailablePort() {
    "use strict";

    var res,
        ports = [],
        netstatOutput = shell.exec('netstat -an -p tcp'),
        ipList = studio.getLocalIpAddresses().split(';'),
        ips = ipList.map(function(ip) { return '(' + ip.replace(/\./, '\\.') + ')'; }).join('|'),
        regex = new RegExp('(' + ips + ')' + '\\.(\\d+)', 'g');

    while(res = regex.exec(netstatOutput)) {
        ports.push(parseFloat(res.pop(), 10));
    }
    var port = 8100;
    while(true) {
        if(ports.indexOf(port) === -1) {
            break;
        }
        port ++;
    }
    return port;
}

function killProcessPid(pid) {
    "use strict";

    if(! pid) {
        return;
    }

    return executeSyncCmd({ cmd: (os.isWindows ? 'taskkill /PID ' : 'kill ') + pid });
}

function wrapCommand(command) {
    if(! os.isWindows && bash_profile.exists) {
        command = 'source ' + bash_profile.file + ';' + command;
    }
    return command;
}

function executeAsyncCmd(command) {
    "use strict";

    var consoleSilentMode = command.options && command.options.consoleSilentMode;
    var cmd = command.cmd
    if(! consoleSilentMode) {
        printConsole({
            message: command.path ? (command.path + ' ') + command.cmd : command.cmd,
            type: 'COMMAND'
        });
    }
    
    var worker = shell.create(wrapCommand(command.cmd), command.path);
    
    worker.onmessage = function(msg) {
        if(! consoleSilentMode) {
            printConsole({
                message: msg,
                type: 'OUTPUT'
            });
        }
    
        if(command.onmessage) {
            command.onmessage(msg);
        }
    };
    
    worker.onerror = function(msg) {
        if(! consoleSilentMode) {
            printConsole({
                message: msg,
                type: 'ERROR'
            });
        }

        if(command.onerror) {
            command.onerror(msg);
        }
    };
    
    worker.onterminated = function(msg) {
        if(! consoleSilentMode && ! (typeof(msg) === 'object'  && msg.type === 'terminate')) {
            printConsole({
                message: msg,
                type: 'OUTPUT'
            });
        }
        if(command.onterminated) {
            command.onterminated(msg);    
        }
    };

    return worker;
}

function executeSyncCmd(command) {
    "use strict";

    var consoleSilentMode = command.options && command.options.consoleSilentMode;
    if(! consoleSilentMode) {
        printConsole({
            message: command.path ? (command.path + ' ') + command.cmd : command.cmd,
            type: 'COMMAND'
        });
    }

    var output = shell.exec(wrapCommand(command.cmd), command.path);

    if(command.onterminated) {
        command.onterminated(output);
    }

    if(! consoleSilentMode) {
        printConsole({
            message: output,
            type: 'OUTPUT'
        });
    }

    return output;
}

/* 
 * studio manipulating storage
*/
function getStorage(name) {
    "use strict";

    return JSON.parse(studio.extension.storage.getItem(name) || '{}');
}

function setStorage(params) {
    "use strict";
    
    var storage = JSON.parse(studio.extension.storage.getItem(params.name) || '{}');
    var updated = params.key === undefined ? storage : storage[params.key];

    if(params.notExtend || typeof params.value !== 'object') {
        updated = params.value;
    } else {
        Object.keys(params.value).forEach(function(prop) {
            if(typeof updated !== 'object') {
                updated = {};
            }
            updated[prop] = params.value[prop];
        });
    }

    if(params.key === undefined) {
        storage = updated;
    } else {
        storage[params.key] = updated;
    }
    studio.extension.storage.setItem(params.name, JSON.stringify(storage));
}


/*
 *  get connected devices infos
 * */
function getConnectedDevices() {
    var devices = {
        ios: [],
        android: []
    },
    output;

    // check for the iphone device
    if(! os.isWindows) {
        try {
            output = executeSyncCmd({ cmd: 'ioreg -w -p IOUSB | grep -w iPhone' });
            devices.ios.connected = /iPhone/.test(output);
        } catch(e) {
            studio.log(e.message);
        }
    }

    // check for the android device
    try {
        output = executeSyncCmd( {cmd: 'adb devices'} );
     
        var regex = /^(\w+)( |\t)+device$/;

        output.split(/\n|\n\r/).forEach(function(row) {
            var match = regex.exec(row);
            if(match) {
                devices.android.push({ id: match[1] });      
            }
        });

        devices.android.connected = devices.android.length > 0;
    } catch(e) {
        studio.log(e.message);
    }

    return devices;
}

exports.printConsole = printConsole;
exports.getMessageString = getMessageString;
exports.getSelectedProjectPath = getSelectedProjectPath;
exports.getSelectedProjectName = getSelectedProjectName;
exports.stringifyFunc = stringifyFunc;
exports.getAvailablePort = getAvailablePort;
exports.executeAsyncCmd = executeAsyncCmd;
exports.executeSyncCmd = executeSyncCmd;
exports.killProcessPid = killProcessPid;
exports.getStorage = getStorage;
exports.setStorage = setStorage;
exports.getConnectedDevices = getConnectedDevices;
