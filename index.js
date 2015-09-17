var utils = require("./utils");
var Base64 = require("base64").Base64;

function checkProject() {
    "use strict";

    var projectName = utils.getSelectedProjectName(),
        projectPath = utils.getSelectedProjectPath();

    // if no (or more than one) project is selected
    if(! projectName) {
        studio.alert('You must select one and only project in your Wakanda Solution to launch Run.');
        return false;
    }

    // test ionic project
    var file = File(projectPath + '/ionic.project');
    if(! file.exists) {
        studio.alert('Your project ' + projectName + ' is not a mobile project, please select a mobile project.');
        return false;
    }

    return true;
}

var actions = {};

actions.initPreferences = function() {
    "use strict";
    studio.extension.registerPreferencePanel('Mobile', 'preferences.json');
};

actions.checkDependencies = function() {
    "use strict";
    
    var status = {};

    var currentOs = os.isWindows ? 'windows' : 'mac';

    [{ 
        cmd: 'node -v',
        title: 'Node',
        mondatory: true
    }, {
        cmd: 'ionic -v',
        title: 'Ionic'
    }, {
        cmd: 'cordova -v',
        title: 'Cordova',
        mondatory: true
    }, {
        cmd: 'xcodebuild -version',
        title: 'xCode',
        mondatory: false,
        os: 'mac'
    }, {
        cmd: 'adb version',
        title: 'Android SDK',
        mondatory: false
    }, {
        cmd: 'echo %JAVA_HOME%',
        title: 'Environnement variable JAVA_HOME',
        validationCallback: function(msg) {
            return msg && msg.replace(/\r?\n|\r/gm, '').trim() !== '%JAVA_HOME%';
        },
        mondatory: true,
        os: 'windows'

    }, {
        cmd: 'echo %ANDROID_HOME%',
        title: 'Environnement variable ANDROID_HOME',
        validationCallback: function(msg) {
            return msg && msg.replace(/\r?\n|\r/gm, '').trim() !== '%ANDROID_HOME%';
        },
        mondatory: true,
        os: 'windows'
    }].forEach(function(check) {

        if(check.os && check.os !== currentOs) {
            return;
        }
        
        var cmd = {
            cmd: check.cmd,
            onmessage: function(msg) {
                var valid = ! check.validationCallback || check.validationCallback(msg);
                status[check.title] = valid;

                utils.setStorage({ name: 'checks', value: status });

                if(valid) {
                    utils.printConsole({
                        message: check.title + ': {%span class="green"%}Found{%/span%} - ' + msg.replace(/\r?\n|\r/, " "),
                        type: 'INFO'
                    });
                } else {
                    utils.printConsole({
                        message: check.title + ': {%span class="' + (check.mondatory ? 'red' : 'orange') + '"%}Not found{%/span%}',
                        type: check.mondatory ? 'ERROR' : 'WARNING' 
                    });
                }

            },
            onerror: function(msg) {
                status[check.title] = false;

                utils.setStorage({ name: 'checks', value: status });

                utils.printConsole({
                    message: check.title + ': {%span class="' + (check.mondatory ? 'red' : 'orange') + '"%}Not found{%/span%}',
                    type: 'ERROR'
                });

            },
            onterminated: function(msg) {
                if (typeof status[check.title] === 'undefined') {
                    status[check.title] = false;
                    
                    utils.setStorage({ name: 'checks', value: status });

                    utils.printConsole({
                        message: check.title + ': {%span class="' + (check.mondatory ? 'red' : 'orange') + '"%}Not found{%/span%}',
                        type: 'WARNING'
                    });
                }
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
        projectName = utils.getSelectedProjectName(),
        port,
        serverLaunched = false;

    if(! checkProject()) {
        return;    
    }

    var opt = {
        'android-ios': {
            'cmd_opt': '--lab',
            'prefix': 'ionic-lab',
            'title': 'iOS / Android',
            'icon': 'icons/iosandroid.png',
            'html': 'html/android-ios.html'
        },
        'android': {
            'cmd_opt': '--platform android',
            'prefix': '?ionicplatform=android#/tab/dash',
            'title': 'Android',
            'icon': 'icons/android.png',
            'html': 'html/android.html'
        },
        'ios': {
            'cmd_opt': '--platform ios',
            'prefix': '?ionicplatform=ios#/tab/dash',
            'title': 'iOS',
            'icon': 'icons/ios.png',
            'html': 'html/ios.html'
        },
        'app': {
            'cmd_opt': '',
            'prefix': '#/tab/dash',
            'title': 'Mobile App',
            'icon': 'icons/app.png',
            'html': 'html/app.html'
        }
    };

    var _getUrl = function() {
        return 'http://127.0.0.1' + ':' + port + '/' + opt[config.selected].prefix;
    };

    var _chromeDisplay = function() {
        var command = {
            cmd: os.isWindows ? 'start chrome ' + _getUrl() : "open -a 'Google Chrome' " + _getUrl()
        };

        utils.executeAsyncCmd(command);
    };

    var _studioDisplay = function() {
        studio.extension.registerTabPage(opt[config.selected].html, opt[config.selected].icon || '', opt[config.selected].title);
        studio.extension.openPageInTab(opt[config.selected].html, opt[config.selected].title, false, false, false, '', 'url=' + _getUrl() + '&serverLaunched=' + serverLaunched);
    };

    var _chromePending = function() {
        studio.extension.registerTabPage('html/chrome.html', opt[config.selected].icon || '', opt[config.selected].title);
        studio.extension.openPageInTab('html/chrome.html', opt[config.selected].title, false, false, false, '', 'url=' + _getUrl() + '&serverLaunched=' + serverLaunched);
    };


    var storage = utils.getStorage('services');
    if(storage[projectName]) {
        // get launched ionic server port
        port = storage[projectName].port;
        serverLaunched = true;

        if(config.chromePreview) {
            _chromeDisplay();
        } else {
            _studioDisplay();
        }
    } else {
        // get available port
        port = utils.getAvailablePort();

        // if studio option, launch disply pending page
        if(config.chromePreview) {
            _chromePending();
        } else {
            _studioDisplay();
        }

        // save the launched ionic services
        utils.setStorage({ name: 'services', key: projectName, value: {  port: port } });

        var command = {
            cmd: 'ionic serve --address 127.0.0.1 --nobrowser --port ' + port,
            path: utils.getSelectedProjectPath(),
            onmessage: function(msg) {
                // save the pid of the process    
                utils.setStorage({ name: 'services', key: projectName, value: {  pid: worker._systemWorker.getInfos().pid } });

                if(config.chromePreview) {
                    _chromeDisplay();
                }
            },
            onterminated: function(msg) {}
        };

        var worker = utils.executeAsyncCmd(command);
    }
};

actions.launchRun = function(message) {
    "use strict";

    if(! checkProject()) {
        return;
    }

    if(! message.params.android && ! message.params.ios) {
        studio.alert('You must select Android or iOs to launch Run emulator.');
        return;
    }

    ['android', 'ios'].forEach(function(platform) {
        if(message.params[platform]) {
            // add the platform
            // and when terminated, launch emulate
            var cmd = {
                cmd: 'ionic platform add ' + platform,
                path: utils.getSelectedProjectPath(),
                onterminated: function(msg) {
                    _emulatePlatform(platform);
                }
            };

            utils.executeAsyncCmd(cmd);   
        }
    });

    var _emulatePlatform = function(platform) {

        platform = platform || 'android';

        var storage = utils.getStorage('emulators');
        storage[platform] = storage[platform] || {};

        // kill ionic service last emulation
        if(storage[platform].pid) {
            utils.killProcessPid(storage[platform].pid);
        }

        var cmd = {
            cmd: (platform === 'android' ? 'ionic emulate android --livereload --port 8100 --livereload-port 35729' : 'ionic emulate ios --livereload --port 8101 --livereload-port 35730'),
            path: utils.getSelectedProjectPath(),
            onmessage: function(msg) {
                // save ionic process pid
                utils.setStorage({ name: 'emulators', key: platform, value: {  pid: worker._systemWorker.getInfos().pid } });
            }
        };

        var worker = utils.executeAsyncCmd(cmd);
    };
};


actions.stopProjectIonicSerices = function() {
    "use strict";
    var services = utils.getStorage('services');

    var emulators =  utils.getStorage('emulators');

    studio.log('Stopping launched ionic project process');
    // kill all launched ionic process
    [services, emulators].forEach(function(storage) {
        Object.keys(storage).forEach(function(elm) {
            if(storage[elm].pid) {
                utils.killProcessPid(storage[elm].pid);
                delete storage[elm];
            }
        });
    });

    utils.setStorage({ name: 'services', value: services, notExtend: true });
    utils.setStorage({ name: 'emulators', value: emulators, notExtend: true });
};

actions.solutionOpenedHandler = function() {
    "use strict";

};

actions.solutionClosedHandler = function() {
    "use strict";
};

actions.getStorage = function() {
    "use strict";

    studio.log('-> storage checks : ' + studio.extension.storage.getItem('checks'));
    studio.log('-> storage services : ' + studio.extension.storage.getItem('services'));
    studio.log('-> storage emulators : ' + studio.extension.storage.getItem('emulators'));
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

actions.launchBuild = function(message) {
    "use strict";

    if(! checkProject()) {
        return;
    }

    if(! message.params.android && ! message.params.ios) {
        studio.alert('You must select Android or iOs to launch Run emulator.');
        return;
    }

    function _enableBuild(enable) {
        if(message.params.origin === 'MobileTest') {
            studio.sendCommand('MobileTest.enableAction.' + Base64.encode(JSON.stringify({ action: 'launchBuild', enable: enable })));
        }
    }

    var build = {};
    ['android', 'ios'].forEach(function(platform) {
        if(message.params[platform]) {

            build[platform] = true;
            var platformName = platform === 'android' ? 'Android' : 'iOS';

            var cmd = {
                cmd: 'ionic build ' + platform + ' --release',
                path: utils.getSelectedProjectPath(),
                onmessage: function(msg) {
                    utils.printConsole({ type: 'INFO', category: 'build', message: 'Building your application for  ' + platformName + ' ...' });
                },
                onerror: function(msg) {
                    // enable build button when build is terminated
                    build[platform] = false;

                    _enableBuild(! build.android && ! build.ios);

                    utils.printConsole({ type: 'ERROR', category: 'build', message: 'Error when building application for ' + platformName + ' .'});
                },
                onterminated: function(msg) {
                    // enable build button when build is terminated
                    build[platform] = false;

                    _enableBuild(! build.android && ! build.ios);
                 
                    // check if builded without error
                    if(msg.exitStatus === 0) {
                        utils.printConsole({ type: 'INFO', category: 'build', message: 'Build for platform ' + platformName + ' is terminated with success.' });
                        utils.printConsole({ type: 'INFO', category: 'build', message: 'Your application build are available.' });
                    } else {
                        utils.printConsole({ type: 'ERROR', category: 'build', message: 'Build existed with error. Exit status : ' + msg.exitStatus });
                    }
                }
            };

            _enableBuild(false);
            utils.executeAsyncCmd(cmd);   
        }
    });
};
