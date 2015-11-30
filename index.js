var utils = require("./utils");
var Base64 = require("base64");

var actions = {};

var status = {};

var currentOs = os.isWindows ? 'windows' : 'mac';

var troubleShootingConfig = {
    xcode: {
        text: 'Install Xcode',
        mac: {
            app: 'ios-app',
            step: '1'
        }
    },
    node: {
        text: 'Install Node.JS',
        windows: {
            app: 'android-app',
            step: '0'
        },
        mac: {
            app: 'ios-app',
            step: '2'
        }
    },
    cordova: {
        text: 'Install Cordova',
        windows: {
            app: 'android-app',
            step: '1'
        },
        mac: {
            app: 'ios-app',
            step: '3'
        }
    },
    ionic: {
        text: 'Install Ionic',
        windows: {
            app: 'android-app',
            step: '2'
        },
        mac: {
            app: 'ios-app',
            step: '4'
        }
    },
    java: {
        text: 'Install Java SDK',
        windows: {
            app: 'android-app',
            step: '3'
        },
        mac: {
            app: 'android-app',
            step: '5'
        }
    },
    android: {
        text: 'Install Android SDK',
        windows: {
            app: 'android-app',
            step: '5'
        },
        mac: {
            app: 'android-app',
            step: '6'
        }
    }
};

function getTroubleShootingLink(config) {
    if (typeof config != 'undefined') {
        return ' - {%a href="#" class="tip" onclick="studio.sendCommand(\'wakanda-extension-trouble-shooting.goToTroubleShootingStep.\'+btoa(JSON.stringify({nickname : \'' +
            config[currentOs].app + '\' , step : ' + config[currentOs].step + '})))"%}' + config.text + ' {%i%}»{%/i%}{%/a%}';
    }
    return '';
}

actions.initPreferences = function () {
    "use strict";

    studio.extension.registerPreferencePanel('MOBILE', 'html/mobilePreferences.html', 300);
};

actions.checkDependencies = function () {
    "use strict";

    [{
        cmd: 'node -v',
        title: 'Node',
        mandatory: true,
        troubleshooting: troubleShootingConfig.node
    }, {
        cmd: 'gulp -v',
        title: 'Gulp',
        mandatory: false,
        defaultMessage: ' - Run: npm install -g gulp'
    }, {
        cmd: 'ionic -v',
        title: 'Ionic',
        mandatory: true,
        troubleshooting: troubleShootingConfig.ionic
    }, {
        cmd: 'cordova -v',
        title: 'Cordova',
        mandatory: true,
        troubleshooting: troubleShootingConfig.cordova
    }, {
        cmd: 'xcodebuild -version',
        title: 'Xcode',
        mandatory: false,
        os: 'mac',
        troubleshooting: troubleShootingConfig.xcode
    }, {
        cmd: 'adb version',
        title: 'Android SDK',
        mandatory: false,
        troubleshooting: troubleShootingConfig.android
    }, {
        cmd: 'echo %JAVA_HOME%',
        title: 'Environment variable JAVA_HOME',
        validationCallback: function (msg) {
            return msg && msg.replace(/\r?\n|\r/gm, '').trim() !== '%JAVA_HOME%';
        },
        mandatory: true,
        os: 'windows',
        troubleshooting: troubleShootingConfig.java
    }, {
        cmd: 'echo %ANDROID_HOME%',
        title: 'Environment variable ANDROID_HOME',
        validationCallback: function (msg) {
            return msg && msg.replace(/\r?\n|\r/gm, '').trim() !== '%ANDROID_HOME%';
        },
        mandatory: true,
        os: 'windows',
        troubleshooting: troubleShootingConfig.android
    }].forEach(function (check) {

        if (check.os && check.os !== currentOs) {
            return;
        }

        var troubleshootingText = getTroubleShootingLink(check.troubleshooting) || check.defaultMessage || '';

        var cmd = {
            cmd: check.cmd,
            onmessage: function (msg) {
                var valid = !check.validationCallback || check.validationCallback(msg);
                status[check.title] = valid;

                utils.setStorage({
                    name: 'checks',
                    value: status
                });

                if (valid) {
                    utils.printConsole({
                        message: check.title + ': {%span class="green"%}Found{%/span%} - ' + msg.replace(/\r?\n|\r/, " "),
                        type: 'INFO'
                    });
                } else {
                    utils.printConsole({
                        message: check.title + ': {%span class="' + (check.mandatory ? 'red' : 'orange') + '"%}Not found{%/span%}' + troubleshootingText,
                        type: check.mandatory ? 'ERROR' : 'WARNING'
                    });
                }

            },
            onerror: function (msg) {
                status[check.title] = false;

                utils.setStorage({
                    name: 'checks',
                    value: status
                });

                utils.printConsole({
                    message: check.title + ': {%span class="' + (check.mandatory ? 'red' : 'orange') + '"%}Not found{%/span%}' + troubleshootingText,
                    type: 'ERROR'
                });

            },
            onterminated: function (msg) {
                if (typeof status[check.title] === 'undefined') {
                    status[check.title] = false;

                    utils.setStorage({
                        name: 'checks',
                        value: status
                    });

                    utils.printConsole({
                        message: check.title + ': {%span class="' + (check.mandatory ? 'red' : 'orange') + '"%}Not found{%/span%}' + troubleshootingText,
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

actions.launchTest = function (message) {
    "use strict";

    var config = message.params,
        projectName = utils.getSelectedProjectName(),
        port,
        serverLaunched = false,
        browserPreviewed = false;

    if (! checkProject()) {
        return;
    }

    if (! status['Ionic']) {
        utils.printConsole({
            message: '{%span class="red"%}Ionic dependency not found{%/span%}' + getTroubleShootingLink(troubleShootingConfig.ionic),
            type: 'ERROR'
        });
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

    var _getUrl = function () {
        return 'http://127.0.0.1' + ':' + port + '/' + opt[config.selected].prefix;
    };

    var _browserDisplay = function () {

        var command = {
            cmd: os.isWindows ? 'start ' + _getUrl() : "open " + _getUrl()
        };

        utils.executeAsyncCmd(command);

    };

    var _studioDisplay = function () {
        studio.extension.registerTabPage(opt[config.selected].html, opt[config.selected].icon || '', opt[config.selected].title);
        studio.extension.openPageInTab(opt[config.selected].html, opt[config.selected].title, false, false, false, '', 'url=' + _getUrl() + '&serverLaunched=' + serverLaunched);
    };

    var _browserPending = function () {
        studio.extension.registerTabPage('html/chrome.html', opt[config.selected].icon || '', opt[config.selected].title);
        studio.extension.openPageInTab('html/chrome.html', opt[config.selected].title, false, false, false, '', 'url=' + _getUrl() + '&serverLaunched=' + serverLaunched);
    };


    var storage = utils.getStorage('services');
    if (storage[projectName]) {
        // get launched ionic server port
        port = storage[projectName].port;
        serverLaunched = true;

        if (config.browserPreview) {
            _browserDisplay();
        } else {
            _studioDisplay();
        }
    } else {
        // get available port
        port = utils.getAvailablePort();

        // if studio option, launch disply pending page
        if (config.browserPreview) {
            _browserPending();
        } else {
            _studioDisplay();
        }

        // save the launched ionic services
        utils.setStorage({
            name: 'services',
            key: projectName,
            value: {
                port: port
            }
        });

        var command = {
            cmd: 'ionic serve --address 127.0.0.1 --nobrowser --port ' + port,
            path: utils.getMobileProjectPath(),
            onmessage: function (msg) {
                // save the pid of the process    
                utils.setStorage({
                    name: 'services',
                    key: projectName,
                    value: {
                        pid: worker._systemWorker.getInfos().pid
                    }
                });

                if (config.browserPreview && !browserPreviewed) {
                    browserPreviewed = true;
                    _browserDisplay();
                }
            },
            onterminated: function (msg) {}
        };

        var worker = utils.executeAsyncCmd(command);
    }
};


actions.launchRun = function (message) {

    if (!checkProject()) {
        return;
    }

    if (currentOs === 'windows' && ! status['Android SDK']) {
        utils.printConsole({
            message: '{%span class="red"%}Android SDK dependency not found{%/span%}' + getTroubleShootingLink(troubleShootingConfig.android),
            type: 'ERROR'
        });
        return;
    }

    if (! status['Ionic']) {
        utils.printConsole({
            message: '{%span class="red"%}Ionic dependency not found{%/span%}' + getTroubleShootingLink(troubleShootingConfig.ionic),
            type: 'ERROR'
        });
        return;
    }

    if (! message.params.emulator.android && ! message.params.emulator.ios && ! message.params.device.android && ! message.params.device.ios) {
        studio.alert('You must select an emulator or a device to run your application.');
        return;
    }

    var running = {};
    ['android', 'ios'].forEach(function (platform) {

        if (message.params.emulator[platform] || message.params.device[platform]) {

            // add the platform
            // and when terminated, launch emulate
            var cmd = {
                cmd: 'ionic platform add ' + platform,
                path: utils.getMobileProjectPath(),
                onterminated: function(msg) {

                    updateStatus('addingPlatform_' + platform, false);

                    studio.hideProgressBarOnStatusBar();
                    studio.showMessageOnStatusBar('Ionic platform ' + platform + ' is added.');

                    // check network interfaces and set ionic config to right address if necessary
                    checkInterface();

                    // add plugins and launch run or emulate
                    addPlugins({
                        pluginName: 'whitelist',
                        url: 'https://github.com/apache/cordova-plugin-whitelist.git',
                        onterminated: function() {
                            if (message.params.emulator[platform]) {
                                emulate(platform);
                            }

                            if (message.params.device[platform]) {
                                run(platform);
                            }
                        }
                    });
                }
            };

            studio.hideProgressBarOnStatusBar();
            studio.showProgressBarOnStatusBar('Ionic adding platform ' + platform + '...');
            updateStatus('addingPlatform_' + platform, true);
            utils.executeAsyncCmd(cmd);
        }
    });

    function addPlugins(plugin) {
        // adding whilelist plugins
        var cmd = {
            cmd: 'ionic plugin add ' + plugin.url,
            path: utils.getMobileProjectPath(),
            onterminated: function (msg) {
                updateStatus('addingPlugin_' + plugin.pluginName, false);

                studio.hideProgressBarOnStatusBar();
                studio.showMessageOnStatusBar('Cordova ' + plugin.pluginName + ' is added.');

                if(plugin.onterminated) {
                    plugin.onterminated.call();
                }
            }
        };

        studio.hideProgressBarOnStatusBar();
        studio.showProgressBarOnStatusBar('Cordova adding plugin ' + plugin.pluginName + '...');
        updateStatus('addingPlugin_' + plugin.pluginName, true);
        utils.executeAsyncCmd(cmd);
    }

    function updateStatus(key, value) {
        running[key] = value;

        var isRunning = false;
        Object.keys(running).forEach(function (key) {
            isRunning = running[key] || isRunning;
        });

        if (isRunning) {
            fireEvent('run');
        } else {
            fireEvent('runFinished');
        }
    }


    function emulate(platform) {

        var platformName = platform === 'android' ? 'Android' : 'iOS';

        studio.hideProgressBarOnStatusBar();
        studio.showProgressBarOnStatusBar('Launching your application on ' + platformName + ' Emulator...');

        var storage = utils.getStorage('emulators');

        storage[platform] = storage[platform] || {};

        // kill the last ionic service for this platform
        if(storage[platform].pid) {
            utils.killProcessPid(storage[platform].pid);
        }

        updateStatus('emulator_' + platform, true);

        var cmd = {
            cmd: (platform === 'android' ? 'ionic emulate android --livereload --port 8100 --livereload-port 35729' : 'ionic emulate ios --livereload --address 127.0.0.1 --port 8101 --livereload-port 35730'),
            path: utils.getMobileProjectPath(),
            onmessage: function(msg) {
                // save ionic process pid
                utils.setStorage({
                    name: 'emulators',
                    key: platform,
                    value: {
                        pid: worker._systemWorker.getInfos().pid
                    }
                });

                // test if emulator is started
                var started = platform === 'android' ? /LAUNCH SUCCESS/.test(msg) : /RUN SUCCEEDED/.test(msg);
                if (started) {
                    studio.hideProgressBarOnStatusBar();
                    studio.showMessageOnStatusBar(platformName + ' Emulator started.');
                    updateStatus('emulator_' + platform, false);
                } else if (!/Ionic server commands, enter:/.test(msg)) {
                    studio.hideProgressBarOnStatusBar();
                    studio.showProgressBarOnStatusBar('Launching your application on ' + platformName + ' Emulator...');
                }
            },
            onterminated: function(msg) {},
            onerror: function(msg) {
                if (!/HAX is working an/.test(msg)) {
                    studio.hideProgressBarOnStatusBar();
                    studio.showMessageOnStatusBar('Error when running ' + platformName + ' Emulator.');
                    updateStatus('emulator_' + platform, false);
                }
            }
        };

        var worker = utils.executeAsyncCmd(cmd);
    }

    function run(platform) {
        var devices = utils.getConnectedDevices();

        var platformName = platform === 'android' ? 'Android' : 'iOS';

        studio.hideProgressBarOnStatusBar();
        studio.showProgressBarOnStatusBar('Launching your application on ' + platformName + ' device.');

        devices[platform].forEach(function(device) {

            updateStatus('device_' + platform + '_' + device.id, true);

            var cmd = {
                cmd: (platform === 'android' ? 'ionic run -slc -device android --target=' + device.id : 'ionic run -slc --device ios'),
                path: utils.getMobileProjectPath(),
                onmessage: function(msg) {
                    utils.setStorage({
                        name: 'devices',
                        key: platform + '_' + device.id,
                        value: {
                            pid: worker._systemWorker.getInfos().pid
                        }
                    });

                    var started = platform === 'android' ? /LAUNCH SUCCESS/.test(msg) : (/RUN SUCCEEDED/.test(msg) || /^success/.test(msg));
                    if (started) {
                        studio.hideProgressBarOnStatusBar();
                        studio.showMessageOnStatusBar('Application started in the device ' + platformName);
                        updateStatus('device_' + platform + '_' + device.id, false);

                    } else if(/process launch failed/.test(msg)) {
                        studio.hideProgressBarOnStatusBar();
                        studio.showMessageOnStatusBar('Error when running ' + platformName + ' device ' + (device.id || ''));
                        updateStatus('device_' + platform + '_' + device.id, false);

                    } else if(!/No Content-Security-Policy meta tag found/.test(msg) && !/Ionic server commands, enter:/.test(msg)) {
                        studio.hideProgressBarOnStatusBar();
                        studio.showProgressBarOnStatusBar('Launching your application on ' + platformName + ' device.');
                    }
                },
                onterminated: function(msg) {
                    updateStatus('device_' + platform + '_' + device.id, false);
                },
                onerror: function(msg) {
                    studio.hideProgressBarOnStatusBar();
                    studio.showMessageOnStatusBar('Error when running ' + platformName + ' device ' + (device.id || ''));
                    updateStatus('device_' + platform + '_' + device.id, false);
                }
            };

            var worker = utils.executeAsyncCmd(cmd);
        });
    }

    function checkInterface() {

        var addresses = getAddresses();

        if (addresses.length < 2) {
            return;
        }

        var platformServeAddress = studio.getPreferences('mobile.platformServeAddress');
        var path = (os.isWindows ? Folder(process.env.USERPROFILE).path : process.env.HOME + '/') + '.ionic/ionic.config',
            file = File(path);

        if (file.exists) {
            var config = JSON.parse(file.toString());
            var address = config.platformServeAddress;

            // check if address and platformServerAddress are valid
            if (address && addresses.indexOf(address) === -1) {
                address = null;
            }
            if (platformServeAddress && addresses.indexOf(platformServeAddress) === -1) {
                platformServeAddress = null;
            }

            var validAdress = platformServeAddress || address || addresses[0];
            if (validAdress !== platformServeAddress) {
                studio.setPreferences('mobile.platformServeAddress', validAdress);
            }

            if (validAdress !== address) {
                config.platformServeAddress = validAdress;

                // update ionic config file
                var blob = (new Buffer(JSON.stringify(config, null, 2))).toBlob();
                blob.copyTo(path, 'OverWrite');
            }
        }
    }

    function getAddresses() {

        var interfaces = os.networkInterfaces();
        var addresses = [];

        Object.keys(interfaces).forEach(function(interface) {
            interfaces[interface].forEach(function(cfg) {
                if (cfg.address !== '127.0.0.1') {
                    addresses.push(cfg.address);
                }
            });
        });

        return addresses;
    }
};
actions.stopProjectIonicSerices = function() {
    "use strict";

    var services = utils.getStorage('services');
    var emulators = utils.getStorage('emulators');
    var devices = utils.getStorage('devices');

    studio.log('Stopping launched ionic project process');
    // kill all launched ionic process
    [services, emulators, devices].forEach(function(storage) {
        Object.keys(storage).forEach(function(elm) {
            if (storage[elm].pid) {
                utils.killProcessPid(storage[elm].pid);
                delete storage[elm];
            }
        });
    });

    utils.setStorage({
        name: 'services',
        value: services,
        notExtend: true
    });
    utils.setStorage({
        name: 'emulators',
        value: emulators,
        notExtend: true
    });
    utils.setStorage({
        name: 'devices',
        value: devices,
        notExtend: true
    });
};

actions.stopProjectGulpServices = stopProjectGulpServices;

actions.getStorage = function() {
    "use strict";

    studio.log('-> storage checks : ' + studio.extension.storage.getItem('checks'));
    studio.log('-> storage services : ' + studio.extension.storage.getItem('services'));
    studio.log('-> storage emulators : ' + studio.extension.storage.getItem('emulators'));
    studio.log('-> storage devices : ' + studio.extension.storage.getItem('devices'));
    studio.log('-> storage gulp : ' + studio.extension.storage.getItem('gulp'));
};

exports.handleMessage = function handleMessage(message) {
    "use strict";

    var actionName = message.action;

    if (!actions.hasOwnProperty(actionName)) {
        studio.alert("I don't know about this message: " + actionName);
        return false;
    }
    actions[actionName](message);
};

actions.launchBuild = function(message) {
    "use strict";

    if (!checkProject()) {
        return;
    }

    if (currentOs == 'windows' && !status['Android SDK']) {
        utils.printConsole({
            message: '{%span class="red"%}Android SDK dependency not found{%/span%}' + getTroubleShootingLink(troubleShootingConfig.android),
            type: 'ERROR'
        });
        return;
    }

    if (!status['Ionic']) {
        utils.printConsole({
            message: '{%span class="red"%}Ionic dependency not found{%/span%}' + getTroubleShootingLink(troubleShootingConfig.ionic),
            type: 'ERROR'
        });
        return;
    }

    if (!message.params.android && !message.params.ios) {
        studio.alert('You must select Android or iOS to launch Build.');
        return;
    }


    var building = {},
        buildingError = {
            android: false,
            ios: false
        };

    function updateStatus(key, value) {
        building[key] = value;

        var isBuilding = false;
        Object.keys(building).forEach(function(key) {
            isBuilding = building[key] || isBuilding;
        });

        if (isBuilding) {
            fireEvent('build');
        } else {
            fireEvent('buildFinished', {
                buildingError: buildingError.android || buildingError.ios
            });
        }
    }

    // launch the build after adding the platform
    function build(platform) {
        var platformName = platform === 'android' ? 'Android' : 'iOS';

        studio.hideProgressBarOnStatusBar();
        studio.showProgressBarOnStatusBar('Building your application for ' + platformName + '.');

        var cmd = {
            cmd: 'ionic build ' + platform + ' --release',
            path: utils.getMobileProjectPath(),
            onmessage: function(msg) {

                // check if the build is successful
                if (platform === 'android' && /BUILD SUCCESSFUL/.test(msg)) {
                    buildingError[platform] = false;
                }

                if (platform === 'ios' && /BUILD SUCCEEDED/.test(msg)) {
                    buildingError[platform] = false;
                }
            },
            onerror: function(msg) {
                studio.hideProgressBarOnStatusBar();
                studio.showMessageOnStatusBar('Error when building application for ' + platformName + '.');
                buildingError[platform] = true;
                utils.printConsole({
                    type: 'ERROR',
                    category: 'build',
                    message: msg
                });

            },
            onterminated: function(msg) {
                // check if builded without error
                if (msg.exitStatus === 0) {
                    if (!buildingError[platform]) {
                        utils.printConsole({
                            type: 'INFO',
                            category: 'build',
                            message: '{%a href="#" onClick="studio.sendCommand(\'wakanda-extension-mobile-core.openBuildFolder.' + Base64.encode(JSON.stringify({
                                platform: platform
                            })) + '\')"%}Open the generated output for ' + platformName + '{%/a%}'
                        });
                        studio.hideProgressBarOnStatusBar();
                        studio.showMessageOnStatusBar('Your application build is available for ' + platformName + '.');
                    }
                } else {
                    studio.hideProgressBarOnStatusBar();
                    studio.showMessageOnStatusBar('Build existed with error. Exit status : ' + msg.exitStatus + '.');
                    buildingError[platform] = true;
                }

                // enable build button when build is terminated
                updateStatus(platform, false);
            }
        };
        utils.executeAsyncCmd(cmd);
    }

    ['android', 'ios'].forEach(function(platform) {
        if (!message.params[platform]) {
            return;
        }

        updateStatus(platform, true);
        var cmd = {
            cmd: 'ionic platform add ' + platform,
            path: utils.getMobileProjectPath(),
            onterminated: function(msg) {
                build(platform);
            },
            onerror: function(msg) {
                if (!/Platform (ios|android) already added/.test(msg)) {
                    //updateStatus(platform, false);
                    utils.printConsole({
                        type: 'ERROR',
                        category: 'build',
                        message: msg
                    });
                }
            }
        };

        studio.hideProgressBarOnStatusBar();
        studio.showProgressBarOnStatusBar('Adding platform ' + platform + '.');
        utils.executeAsyncCmd(cmd);
    });
};

actions.openBuildFolder = function(message) {
    "use strict";

    utils.executeAsyncCmd({
        cmd: os.isWindows ? 'explorer .' : 'open .',
        path: message.params.platform === 'android' ? utils.getMobileProjectPath() + '/platforms/android/build/outputs/apk' : utils.getMobileProjectPath() + '/platforms/ios/'
    });
};

actions.updateIonicConfig = function(message) {
    updateIonicConfig(message.params);
};

actions.launchWebPreview = function(message) {
    var config = message.params,
        projectName = utils.getSelectedProjectName();

    // if no (or more than one) project is selected
    if (!projectName) {
        studio.alert('You must select one and only one project in your Wakanda Solution.');
        return false;
    }

    // check if server is connected, else start it
    var serverStatus = studio.isCommandChecked('startWakandaServer');
    if (serverStatus) {
        webPreview(config.webStudioPreview);
    } else {
        utils.setStorage({
            name: 'waitingServerConnect',
            value: {
                waiting: true,
                webStudioPreview: config.webStudioPreview,
                dateTime: new Date().getTime()
            }
        });

        fireEvent('webRunWaitConnectToServer');
        studio.sendCommand('StartWakandaServer');
    }
};

actions.handleOnServerStartAbort = function(message) {
    var storage = utils.getStorage('waitingServerConnect');

    if (! storage.waiting) {
        return;
    }

    fireEvent('startServerAborted');

    utils.setStorage('waitingServerConnect', {waiting: false }); 
};

actions.handleServerConnect = function(message) {
    var storage = utils.getStorage('waitingServerConnect'),
        timeout = 2; // timeout is in seconds unit

    if (!storage.waiting) {
        return;
    }

    fireEvent('webRunConnectedToServer');

    utils.setStorage('waitingServerConnect', {
        waiting: false
    });

    // if server is not launched after 2 minutes, do nothing !
    if (new Date().getTime() - storage.dateTime > timeout * 60 * 1000) {
        utils.printConsole({
            type: 'ERROR',
            message: 'Waiting to connect to solution server exceeds ' + timeout + ' seconds, Running web action is cancelled.'
        });
        return;
    }

    webPreview(storage.webStudioPreview);
};

function webPreview(webStudioPreview) {
    var projectPath = utils.getWebProjectPath(),
        projectName = utils.getSelectedProjectName(),
        gulpInstalled = false,
        displayed = false,
        options = {
            connectPort: 8000,
            serverUrl: studio.getProjectURL()
        };
    

    if(! studio.Folder(utils.getSelectedProjectPath() + '/web/').exists || ! studio.File(projectPath + '/app/index.html').exists) {
        // default behavior, for prototyper and Wakanda scaffolding project < WAK11
        _display(false);
        return;
    }

    // check if gulp installed
    // running in synchronous mode crash the console
    utils.executeAsyncCmd({
        cmd: 'gulp -v',
        onterminated: function(msg) {
            gulpInstalled = msg.exitStatus === 0;
            _preview();
        }
    });

    function _preview() {
        if(! status.Node || ! gulpInstalled) {
            utils.printConsole({
                message: '{%span class="orange"%}Live reloading is currently deactivated. If you want the page to reload automatically after any file changes occur, please install node and gulp.{%/span%}',
                type: 'INFO'
            });

            if(! status.Node) {
                utils.printConsole({
                    message: '{%span class="orange"%}Node: Not Found - Install Node »{%/span%}' + getTroubleShootingLink(troubleShootingConfig.node),
                    type: 'WARNING'
                });    
            }

            if(! gulpInstalled) {
                utils.printConsole({
                    message: '{%span class="orange"%}Gulp: Not Found - Install Gulp{%/span%}' + ' - Run: npm install -g gulp{%/span%}',
                    type: 'WARNING'
                });    
            }

            utils.printConsole({
                message: '{%span class="orange"%}If necessary, you can add custom paths by going to Preferences > Environment variables.{%/span%}',
                type: 'INFO'
            });

        }

        // check if to use gulp is installed and configured for this web project
        // else, open only index.html
        if (! status.Node || ! status.Gulp || ! studio.File(projectPath + '/gulpfile.js').exists || ! studio.File(projectPath + '/package.json').exists) {
            _display(false);

        } else { // launch livereload using node
            // install node modules
            fireEvent('webInstallingNpmModules');

            studio.hideProgressBarOnStatusBar();
            studio.showProgressBarOnStatusBar('Installing npm modules from package.json ...');

            var command = {
                cmd: 'npm install',
                path: projectPath,
                onterminated: function(msg) {
                    fireEvent('webInstallingNpmModulesFinished');
                    studio.hideProgressBarOnStatusBar();
                    if (msg.exitStatus === 0) {
                        _launchGulp();
                        studio.showMessageOnStatusBar('npm modules installed.');
                    } else {
                        _display(webStudioPreview);
                        studio.showMessageOnStatusBar('npm modules installation exited with errors.');
                    }
                }
            };
            utils.executeAsyncCmd(command);
        }
    }

    function _launchGulp() {
        // stop launched gulp
        stopProjectGulpServices();

        var command = {
            cmd: 'gulp serve --serverUrl ' + options.serverUrl + ' --connectPort ' + options.connectPort,
            path: projectPath,
            onmessage: function(msg) {
                if(! displayed) {
                    displayed = true;
                    _display(true);
                }
                utils.setStorage({
                    name: 'gulp',
                    key: projectName,
                    value: {
                        pid: worker._systemWorker.getInfos().pid
                    }
                });
            },
            onterminated: function(msg) {
            }
        };
        var worker = utils.executeAsyncCmd(command);
    }

    function _display(livereload) {
        var url = livereload ? 'http://127.0.0.1:' + options.connectPort + '/' : options.serverUrl;

        if (webStudioPreview) {
            studio.extension.registerTabPage('html/webapp.html', 'icons/app.png', 'Web App');
            studio.extension.openPageInTab('html/webapp.html', 'Web App', false, false, false, '', 'url=' + url);
        } else {
            utils.executeAsyncCmd({
                cmd: os.isWindows ? 'start ' + url : 'open ' + url
            });
        }
    }
}

function updateIonicConfig(values) {
    var path = process.env.HOME + '/.ionic/ionic.config',
        file = File(path);

    if (file.exists) {
        var config = JSON.parse(file.toString());
        Object.keys(values).forEach(function(key) {
            config[key] = values[key];
        });

        // update ionic config file
        var blob = (new Buffer(JSON.stringify(config, null, 2))).toBlob();
        blob.copyTo(path, 'OverWrite');
    }
}

function fireEvent(eventName, data) {
    studio.sendCommand('wakanda-extension-mobile-test.listenEvent.' + Base64.encode(JSON.stringify({
        eventName: eventName,
        data: data
    })));
}

function checkProject() {
    "use strict";

    var projectName = utils.getSelectedProjectName(),
        projectPath = utils.getMobileProjectPath();

    // if no (or more than one) project is selected
    if (!projectName) {
        studio.alert('You must select one and only one project in your Wakanda Solution.');
        return false;
    }

    // test ionic project
    var file = File(projectPath + '/ionic.project');
    if (!file.exists) {
        studio.alert('Your project ' + projectName + ' is not a mobile project, please select a mobile project.');
        return false;
    }

    return true;
}

function stopProjectGulpServices() {

    var services = utils.getStorage('gulp');
    Object.keys(services).forEach(function(elm) {
        if (services[elm].pid) {
            utils.killProcessAndChild(services[elm].pid);
            delete services[elm];
        }
    });

    utils.setStorage({
        name: 'gulp',
        value: services,
        notExtend: true
    });
}
