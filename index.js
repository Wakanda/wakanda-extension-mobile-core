var shell = require("../lib/shellWorker");
var utils = require("../lib/utils");
var Base64 = require("../lib/base64").Base64;

function emulatePlatform(platform) {
	"use strict";

    platform = platform || 'android';
    var cmd = {
        'cmd': 'ionic emulate ' + platform + ' --livereload',
        'path': utils.getSelectedProjectPath()
    };
    utils.executeAsyncCmd(cmd);
}

var actions = {};

actions.checkDependencies = function() {
	"use strict";
	
    var status = {};

    var _updateStatus = function() {
        studio.extension.storage.setItem('MobileCheck', JSON.stringify(status));
    };

    [{ 
        cmd: 'node -v',
        title: 'Node'
     }, {
        cmd: 'ionic -v',
        title: 'Ionic'
     }, {
        cmd: 'cordova -v',
        title: 'Cordova'
     }, {
        cmd: 'xcode-select -p',
        title: 'xCode'
     }, {
        cmd: 'adb version',
        title: 'Android SDK'
     }].forEach(function(check) {
        var cmd = {
            cmd: check.cmd,
            onmessage: function(msg) {
                status[check.title] = true;
                _updateStatus();

                utils.printConsole({
                    message: check.title + ': {%span class="green"%}Found{%/span%} - ' + msg,
                    type: 'LOG'
                });

            },
            onerror: function(msg) {
                status[check.title] = false;
                _updateStatus();

                utils.printConsole({
                    message: check.title + ': {%span class="red"%}Not found{%/span%}' + msg,
                    type: 'ERROR'
                });

            },
            options: {
                consoleSilentMode: true
            }
        };
        utils.executeAsyncCmd(cmd);
    });

	return true;
};

actions.launchTest = function(message) {
	"use strict";

    var config = message.params,
        ionicServices = JSON.parse(studio.extension.storage.getItem('ionicServices') || '{}'),
        projectName = utils.getSelectedProjectName(),
        port;

    // if no (or more than one) project is selected
    if(! projectName) {
        studio.alert('You must select one and only project in your Wakanda Solution to launch Test.');
        return;
    }

    var opt = {
        'android-ios': {
            'cmd_opt': '--lab',
            'prefix': 'ionic-lab',
            'title': 'iOS / Android',
            'icon': 'iosandroid.png'
        },
        'android': {
            'cmd_opt': '--platform android',
            'prefix': '?ionicplatform=android#/tab/dash',
            'title': 'Android',
            'icon': 'android.png'
        },
        'ios': {
            'cmd_opt': '--platform ios',
            'prefix': '?ionicplatform=ios#/tab/dash',
            'title': 'iOS',
            'icon': 'ios.png'
        },
        'app': {
            'cmd_opt': '',
            'prefix': '#/tab/dash',
            'title': 'Mobile App',
            'icon': 'app.png'
        }
    };

    var _getUrl = function() {
        return 'http://127.0.0.1' + ':' + port + '/' + opt[config.selected].prefix;
    };

    var _display = function() {
        if(config.chromePreview) {
            var command = {
                cmd: os.isWindows ? 'start chrome ' + _getUrl() : "open -a 'Google Chrome' " + _getUrl()
            };

            utils.executeAsyncCmd(command);

        } else {
            if(config.selected === 'android-ios') {
                studio.extension.registerTabPage('android-ios.html', opt[config.selected].icon || '', opt[config.selected].title);
                studio.extension.openPageInTab('android-ios.html', opt[config.selected].title, false, false, false, '', 'url=' + _getUrl());
                    
            } else {
                studio.extension.registerTabPage(_getUrl(), opt[config.selected].icon || '', opt[config.selected].title);
                studio.extension.openPageInTab(_getUrl(), opt[config.selected].title, false);
            }
        }   
    };

    if(ionicServices[projectName]) {
        port = ionicServices[projectName].port;
        _display();

    } else {
        port = utils.getAvailablePort();
        var command = {
            cmd: 'ionic serve --address 127.0.0.1 --nobrowser --port ' + port,
            path: utils.getSelectedProjectPath(),
            onmessage: _display
        };

        utils.executeAsyncCmd(command);

        ionicServices[projectName] = { port: port };
        studio.extension.storage.setItem('ionicServices', JSON.stringify(ionicServices));
    }

    return true;
};

actions.launchRun = function(message) {
	"use strict";

    var projectName = utils.getSelectedProjectPath();

    // if no (or more than one) project is selected
    if(! projectName) {
        studio.alert('You must select one and only project in your Wakanda Solution to launch Run.');
        return;
    }

    ['android', 'ios'].forEach(function(platform) {
        if(message.params[platform]) {
            var cmd = {
                'cmd': 'ionic platform add ' + platform,
                'path': projectName,
                'onterminated': function(msg) {
                    emulatePlatform(platform);
                }
            };

            utils.executeAsyncCmd(cmd);   
        }
    });
};

actions.solutionOpenedHandler = function() {
	"use strict";

    studio.extension.storage.setItem('ionicServices', '{}');
};

actions.solutionClosedHandler = function() {
	"use strict";
};

actions.getStorage = function() {
    studio.log('>>> storage : ' + studio.extension.storage.getItem('MobileCheck'));
};

exports.handleMessage = function handleMessage(message) {
	"use strict";
	var actionName;

	actionName = message.action;

	if (!actions.hasOwnProperty(actionName)) {
		studio.alert("I don't know about this message: " + actionName);
		return false;
	}
	actions[actionName](message);
};
