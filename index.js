var utils = require("./utils");
var Base64 = require("base64");

var actions = {};
var dependencies = {};

var currentOs = os.isWindows ? 'windows' : 'mac';

function updateDependenciesStatus() {
    var solutionDependencies = studio.getPreferences('solution.dependencies');
    if (solutionDependencies) {
        try {
            dependencies = JSON.parse(solutionDependencies);
        } catch(err) {
            utils.printConsole({ message: err, type: 'error' });
            dependencies = {};
        }
    }
}

function checkDependency(depName) {
    if (dependencies[depName] && !dependencies[depName].status) {
        return false;
    }
    return true;
}

function getTroubleShootingLink(dep) {
    if (typeof dep != 'undefined' && dep.troubleshooting) {
        var depApp = (typeof dep.troubleshooting[currentOs] !== 'undefined') ? dep.troubleshooting[currentOs].app : dep.troubleshooting.app;
        var depStep = (typeof dep.troubleshooting[currentOs] !== 'undefined') ? dep.troubleshooting[currentOs].step : dep.troubleshooting.step;
        return ' - {%a href="#" class="tip" onclick="studio.sendCommand(\'wakanda-extension-trouble-shooting.goToTroubleShootingStep.\'+btoa(JSON.stringify({nickname : \'' +
            depApp + '\' , step : ' + depStep + '})))"%}' + dep.text + ' {%i%}»{%/i%}{%/a%}';
    }
    return '';
}

actions.initPreferences = function () {
    studio.extension.registerPreferencePanel('MOBILE', 'html/mobilePreferences.html', 300);
};

// ionic preview
var ionicOptions = {
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

function isIonic2Project() {
    var mobilePath = utils.getMobileProjectPath();
    var file = File(mobilePath + '/ionic.config.json');
    
    if(file.exists) {
        var config = JSON.parse(file.toString());
        return config && config.v2;
    } else {
        return false;
    }
}

function mobileViewPending(config, message) {
    var tab = {
        html: config.browserPreview ? 'html/chrome.html' : ionicOptions[config.selected].html,
        title: ionicOptions[config.selected].title,
        icon: ionicOptions[config.selected].icon,
        selected: config.browserPreview ? 'chrome' : config.selected
    };
    viewPending(tab, message);
}

function mobileViewTab(config, url) {
    var tab = {
        html: ionicOptions[config.selected].html,
        title: ionicOptions[config.selected].title,
        icon: ionicOptions[config.selected].icon,
        selected: config.browserPreview ? 'chrome' : config.selected
    };

    viewTab(tab, url);
}

function viewPending(tab, message) {
    if(! tabIsOpened(tab.html)) {
        studio.extension.registerTabPage(tab.html, tab.icon || '', tab.title || '');
        studio.extension.openPageInTab(tab.html, tab.title, false, false, false, '', 'action=setPending&selected=' + tab.selected + '&message=' + message, true, true);
    } else {
        studio.sendExtensionWebZoneCommand('wakanda-extension-mobile-core', 'setPending', [{ selected: tab.selected, message: message }]);
    }
}

function viewTab(tab, url) {
    if(! tabIsOpened(tab.html)) {
        studio.extension.registerTabPage(tab.html, tab.icon || '', tab.title || '');
        studio.extension.openPageInTab(tab.html, tab.title, false, false, false, '', 'action=setIframeSrc&g&selected=' + tab.selected + '&url=' + url, true, true);
    } else {
        studio.sendExtensionWebZoneCommand('wakanda-extension-mobile-core', 'setIframeSrc', [{ selected: tab.selected, url: url }]);
    }
}

function tabIsOpened(name) {
    var path = studio.extension.getFolder().path;
    path += path.slice(-1) === '/' ? '' : '/';

    return (studio.getTabsList() || []).some(function(elm) {
      return elm.path === path + name;
    });
}

function closeTab(name) {
    var path = studio.extension.getFolder().path;
    path += path.slice(-1) === '/' ? '' : '/';

    return studio.closeTab(path + name);
}

function webAppViewPending(config, message) {
    var tab = {
        html: config.webStudioPreview ? 'html/webapp.html' : 'html/webapp-browser.html',
        title: 'Web App',
        icon: 'icons/app.png',
        selected: config.webStudioPreview ? 'webapp' : 'webapp-browser'
    };
    viewPending(tab, message);
}

function installNpmDependencies(options) {
    if(utils.checkInstalledNodeModules(options.path)) {
        options.onSuccess &&  options.onSuccess();
    }
    if(! utils.isOnline()) {
        var msg = 'You cannot install npm dependencies without internet connection. Please check your internet connection and try again!'; 
        utils.printConsole({ message: msg, type: 'error' });
        options.onError && options.onError(msg);
        return;
    }
    var cmd = {
        cmd: 'npm install',
        path: options.path,
        onterminated: function(msg) {
            watchSolutionForlder(true);            
            if(msg.exitStatus !== 0) {
                utils.printConsole({ type: 'error', message: 'Installation of npm dependencies exited with errors!' });        
            }
            options.onSuccess && options.onSuccess();
            studio.hideProgressBarOnStatusBar();
            studio.showMessageOnStatusBar('Installation of npm dependencies is finished');
        }
    };
    studio.hideProgressBarOnStatusBar();
    studio.showProgressBarOnStatusBar('Installing npm dependencies...');
    watchSolutionForlder(false);
    utils.executeAsyncCmd(cmd);
}

function watchSolutionForlder(toWatch) {
    if(toWatch) {
        //studio.log('>- start watching solution folders');
        studio.startWatchingFolders();
    } else {
        //studio.log('>- stop watching solution folders');
        studio.stopWatchingFolders();
    }
}

function webAppViewTab(config, url) {
    var tab = {
        html: config.webStudioPreview ? 'html/webapp.html' : 'html/webapp-browser.html',
        title: 'Web App',
        icon: 'icons/app.png',
        selected: config.webStudioPreview ? 'webapp' : 'webapp-browser'
    };

    viewTab(tab, url);
}

actions.launchTest = function (message) {
    var params = message.params,
        wakServerStarted = studio.isCommandChecked('startWakandaServer');

    updateDependenciesStatus();
    
    if (! checkMobileProject()) {
        return;
    }

    // check if server is connected
    if (wakServerStarted) {
        actions.ionicPreview(message);
    } else {
        mobileViewPending(params, 'wakanda-server');
        utils.setStorage({
            name: 'waitingServerConnect',
            value: {
                waiting: true,
                callback: 'ionicPreview',
                abortCallback: 'ionicPreviewServerAbort',
                params: message,
                dateTime: new Date().getTime()
            }
        });
        fireEvent('mobileTestWaitConnectToServer');
        studio.sendCommand('StartWakandaServer');
    }
};

actions.ionicPreviewServerAbort = function(message) {
    var config = message.params;
    var page = config.browserPreview ? 'html/chrome.html' : ionicOptions[config.selected].html;
    if(tabIsOpened(page)) {
        closeTab(page);
    }
};

actions.ionicPreview = function(message) {
    var projectName = utils.getSelectedProjectName(),
        storage = utils.getStorage('services'),
        port = storage[projectName] ? storage[projectName].port : undefined,
        config = message.params,
        mobilePath = utils.getMobileProjectPath();
            
    if (port) {
        preview();
    } else {
        if(isIonic2Project()) {
            mobileViewPending(config, 'npm install');
            fireEvent('mobilePreviewtInstallingModules');
            installNpmDependencies({
                path: mobilePath,
                onSuccess: function() {
                    fireEvent('mobilePreviewtInstallingModulesFinished');
                    serve();            
                },
                onError: function() {
                    fireEvent('mobilePreviewtInstallingModulesFinished');
                    if(! utils.isOnline()) {
                        studio.alert('To preview your application, you should have an internet connection to install the required npm dependencies. Please check your internet connection and try again!');
                    }                                              
                }
            });      
        } else {
            serve();
        }
    }

    function serve() {
        // get available port
        port = utils.getAvailablePort();

        // save the launched ionic services
        utils.setStorage({ name: 'services', key: projectName, value: {  port: port } });

        var command = {
            cmd: 'ionic serve --address 127.0.0.1 --nobrowser --port ' + port,
            path: mobilePath,
            onmessage: function (msg) {
                // save the pid of the process
                utils.setStorage({ name: 'services', key: projectName, value: {  pid: worker._systemWorker.getInfos().pid } });

                if(msg.indexOf('ionic $') !== -1) {
                    studio.hideProgressBarOnStatusBar();
                    studio.showMessageOnStatusBar('Ionic server is started');
                    preview();
                }

                if(currentOs === 'windows' && msg.indexOf(' changed') !== -1){
                  studio.sendExtensionWebZoneCommand('wakanda-extension-mobile-core', 'reloadIframes');
                }
            }
        };
        mobileViewPending(config, 'ionic serve');
        
        studio.hideProgressBarOnStatusBar();
        studio.showProgressBarOnStatusBar('Starting Ionic server...');

        var worker = utils.executeAsyncCmd(command);  
    }

    function preview() {
        var url = 'http://127.0.0.1' + ':' + port + '/' + ionicOptions[config.selected].prefix;
        if(config.browserPreview) {
            if(tabIsOpened('html/chrome.html')) {
                closeTab('html/chrome.html');
            }
            // open browser
            utils.executeAsyncCmd({ cmd: os.isWindows ? 'start ' + url : 'open ' + url });
        } else {
            mobileViewTab(config, url);
        }
    }
};

actions.launchRun = function (message) {
    updateDependenciesStatus();

    if (! checkMobileProject()) {
        return;
    }
    // check if server is connected, else start it
    var serverStatus = studio.isCommandChecked('startWakandaServer');
    if (serverStatus) {
        actions.ionicRun(message);
    } else {
        utils.setStorage({
            name: 'waitingServerConnect',
            value: {
                waiting: true,
                callback: 'ionicRun',
                params: message,
                dateTime: new Date().getTime()
            }
        });
        fireEvent('mobileRunWaitConnectToServer');
        studio.sendCommand('StartWakandaServer');
    }
};

actions.ionicRun = function(message) {
    var params = message.params,
        running = {},
        tasks = [],
        platforms = [],
        mobilePath = utils.getMobileProjectPath(),
        plugins = [{ url: 'https://github.com/apache/cordova-plugin-whitelist.git', name: 'Whitelist' }];

    ['android', 'ios'].forEach(function(platform) {
        if(params.emulator[platform] || params.device[platform]) {
            platforms.push(platform);
        }
    });

    if(platforms.indexOf('android') !== -1 && ! checkDependency('android')) {
        utils.printConsole({
            message: '{%span class="red"%}Android SDK dependency not found{%/span%}' + getTroubleShootingLink(dependencies.android),
            type: 'ERROR'
        });
        return;
    }

    if(! platforms.length) {
        studio.alert('You must select an emulator or a device to run your application.');
        return;
    }
    
    tasks.push({ callback: checkInstalledNodeModules });
    
    tasks.push({ callback: checkAddedPlatforms });
    
    tasks.push({ callback: checkAddedPlugin });

    tasks.push({ callback: checkInterface });

    platforms.forEach(function(platform) {
        tasks.push({
            callback: function() {
                if(params.emulator[platform]) {
                    emulate(platform);
                }

                if(params.device[platform]) {
                    run(platform);
                }
            }
        });
    });

    tasker();

    function tasker() {
        if(! tasks.length) {
            return;
        }

        var task = tasks.shift();
        task.callback.apply(task, task.params instanceof Array ? task.params : [ task.params ]);
    }
    
    function checkInstalledNodeModules() {
        if(! isIonic2Project() || utils.checkInstalledNodeModules(mobilePath)) {
            tasker();
            return;
        }
        
        if(! utils.isOnline()) {
            var message = 'To run your application, you should have an internet connection to install the required npm dependencies. Please check your internet connection and try again!';
            studio.alert(message);
            utils.printConsole({ TYPE: 'ERROR', message: message });
            return;
        }
        var cmd = {
            cmd: 'npm install',
            path: mobilePath,
            onterminated: function(msg) {
                watchSolutionForlder(true);
                if(msg.exitStatus !== 0) {
                    utils.printConsole({ TYPE: 'ERROR', message: 'Installation of npm dependencies exited with errors!' });        
                }
                updateStatus('installNodeModules', false);
                tasker();
            }  
        };
        updateStatus('installNodeModules', true);
        studio.hideProgressBarOnStatusBar();
        studio.showProgressBarOnStatusBar('Installing npm dependencies...');
        watchSolutionForlder(false);
        utils.executeAsyncCmd(cmd);
    }
    
    function checkAddedPlatforms() {
        var added = [];
        var cmd = {
            cmd: 'ionic platform list',
            path: mobilePath,
            onmessage: function(msg) {
                if(msg && msg.indexOf('Installed platforms') !== -1) {
                    var arr = /Installed platforms:(.*)Available platforms:/.exec(msg.replace(/\n|(\n\r)/g, '||'));                        
                    if(arr && arr.length > 1) {
                        added = arr[1].split('||').filter(function(p) { return p && p.trim() !== ''; });
                    }                 
                }                          
            },
            onterminated: function(msg) {
                platforms.forEach(function(platform) {
                    var isAdded = added.some(function(p) {
                        return p.indexOf(platform) !== -1;
                    });
                    
                    if(! isAdded) {
                        tasks.unshift({ callback: addPlaform, params: platform });
                    }
                });
                updateStatus('checkPlatforms', false);
                tasker();
            }
        };
        updateStatus('checkPlatforms', true);
        studio.hideProgressBarOnStatusBar();
        studio.showProgressBarOnStatusBar('Check added Cordova platforms');
        utils.executeAsyncCmd(cmd);
    }
    
    function checkAddedPlugin() {
        var added = [];
        var cmd = {
            cmd: 'ionic plugin list',
            path: mobilePath,
            onmessage: function(msg) {
                if(msg && msg.indexOf('plugin') !== -1) {
                    var regex = /"(.+)"/;
                    msg.split(/\n|(\n\r)/).forEach(function(row) {
                        var arr = regex.exec(row);
                        if(arr && arr.length > 1) {
                            added.push(arr[1]);    
                        }    
                    });
                }
            },
            onterminated: function(msg) {
                plugins.forEach(function(plugin) {
                    if(added.indexOf(plugin.name) === -1) {
                        tasks.unshift({ callback: addPlugin, params: plugin });
                    }
                });
                tasker();
            }
        };

        studio.hideProgressBarOnStatusBar();
        studio.showProgressBarOnStatusBar('Check added Cordova plugins');
        utils.executeAsyncCmd(cmd);
    }

    function addPlaform(platform) {
        // add the platform
        var cmd = {
            cmd: 'ionic platform add ' + platform,
            path: utils.getMobileProjectPath(),
            onterminated: function(msg) {
                updateStatus('addingPlatform_' + platform, false);
                studio.hideProgressBarOnStatusBar();
                studio.showMessageOnStatusBar('Ionic platform ' + platform + ' is added.');

                tasker();
            }
        };

        studio.hideProgressBarOnStatusBar();
        studio.showProgressBarOnStatusBar('Ionic adding platform ' + platform + '...');
        updateStatus('addingPlatform_' + platform, true);
        utils.executeAsyncCmd(cmd);
    }

    function addPlugin(plugin) {
        var cmd = {
            cmd: 'ionic plugin add ' + plugin.url,
            path: utils.getMobileProjectPath(),
            onterminated: function (msg) {
                updateStatus('addingPlugin_' + plugin.name, false);

                studio.hideProgressBarOnStatusBar();
                studio.showMessageOnStatusBar('Cordova ' + plugin.name + ' is added.');

                tasker();
            }
        };

        studio.hideProgressBarOnStatusBar();
        studio.showProgressBarOnStatusBar('Cordova adding plugin ' + plugin.name + '...');
        updateStatus('addingPlugin_' + plugin.name, true);
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
        var platformEmulatorName = platform === 'android' ? 'Android Emulator' : 'iOS Simulator',
            isInExecution = false;

        studio.hideProgressBarOnStatusBar();
        studio.showProgressBarOnStatusBar('Launching your application on ' + platformEmulatorName + '...');

        var storage = utils.getStorage('emulators');

        storage[platform] = storage[platform] || {};

        // kill the last ionic service for this platform
        if(storage[platform].pid) {
            utils.killProcessPid(storage[platform].pid);
        }

        updateStatus('emulator_' + platform, true);

        var connectPort = utils.getAvailablePort(8100);
        var livereloadPort = utils.getAvailablePort(35729);
        var started = {};
        var cmd = {
            cmd: (platform === 'android' ?
                'ionic emulate android --port ' + connectPort + ' --livereload --livereload-port ' + livereloadPort :
                'ionic emulate ios --address 127.0.0.1 --port ' + connectPort + ' --livereload --livereload-port ' + livereloadPort),
            path: utils.getMobileProjectPath(),
            onmessage: function(msg) {
                // save ionic process pid
                utils.setStorage({ name: 'emulators', key: platform, value: {  pid: worker._systemWorker.getInfos().pid } });

                // test if emulator is started
                if(! started[platform]) {
                    started[platform] = platform === 'android' ? /LAUNCH SUCCESS/.test(msg) : /(RUN SUCCEEDED|BUILD SUCCEEDED)/.test(msg);    
                }
                 
                if (started[platform]) {
                    studio.hideProgressBarOnStatusBar();
                    studio.showMessageOnStatusBar(platformEmulatorName + ' started.');
                    updateStatus('emulator_' + platform, false);
                } else if (!/Ionic server commands, enter:/.test(msg)) {
                    studio.hideProgressBarOnStatusBar();
                    studio.showProgressBarOnStatusBar('Launching your application on ' + platformEmulatorName + '...');
                }

                // launch tasker for the first message (command is in execution)
                if(! isInExecution) {
                    isInExecution = true;
                    tasker();
                }
            },
            onterminated: function(msg) {
                studio.hideProgressBarOnStatusBar();
            },
            onerror: function(msg) {
                if (!/HAX is working an/.test(msg)) {
                    studio.hideProgressBarOnStatusBar();
                    studio.showMessageOnStatusBar('Error when running ' + platformEmulatorName + '.');
                    updateStatus('emulator_' + platform, false);
                }
            }
        };

        var worker = utils.executeAsyncCmd(cmd);
    }

    function run(platform) {
        var devices = utils.getConnectedDevices(),
            isInExecution = false;

        var platformName = platform === 'android' ? 'Android' : 'iOS';

        studio.hideProgressBarOnStatusBar();
        studio.showProgressBarOnStatusBar('Launching your application on ' + platformName + ' device.');

        devices[platform].forEach(function(device) {

            updateStatus('device_' + platform + '_' + device.id, true);

            var cmd = {
                cmd: (platform === 'android' ? 'ionic run -slc -device android --target=' + device.id : 'ionic run -slc --device ios'),
                path: utils.getMobileProjectPath(),
                onmessage: function(msg) {
                    utils.setStorage({ name: 'devices', key: platform + '_' + device.id, value: {  pid: worker._systemWorker.getInfos().pid } });

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

                    // launch tasker for the first message (command is in execution)
                    if(! isInExecution) {
                        isInExecution = true;
                        tasker();
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
            tasker();
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

        tasker();
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

actions.stopProjectIonicServices = function() {
    var services = utils.getStorage('services');
    var emulators = utils.getStorage('emulators');
    var devices = utils.getStorage('devices');

    studio.log('Stopping launched Ionic project process');
    // kill all launched ionic process
    [services, emulators, devices].forEach(function(storage) {
        Object.keys(storage).forEach(function(elm) {
            if (storage[elm].pid) {
                utils.killProcessPid(storage[elm].pid);
                delete storage[elm];
            }
        });
    });

    utils.setStorage({ name: 'services', value: services, notExtend: true });
    utils.setStorage({ name: 'emulators', value: emulators, notExtend: true });
    utils.setStorage({ name: 'devices', value: devices, notExtend: true });
};

actions.stopNpmServeServices = function() {
    var services = utils.getStorage('npm-serve');
    Object.keys(services).forEach(function(elm) {
        if (services[elm].pid) {
            utils.killProcessAndChild(services[elm].pid);
            delete services[elm];
        }
    });

    utils.setStorage({
        name: 'npm-serve',
        value: services,
        notExtend: true
    });
};

actions.getStorage = function() {
    studio.log('-> storage checks : ' + studio.extension.storage.getItem('checks'));
    studio.log('-> storage services : ' + studio.extension.storage.getItem('services'));
    studio.log('-> storage emulators : ' + studio.extension.storage.getItem('emulators'));
    studio.log('-> storage devices : ' + studio.extension.storage.getItem('devices'));
    studio.log('-> storage serve webapp : ' + studio.extension.storage.getItem('gulp'));
    studio.log('-> storage waiting server : ' + studio.extension.storage.getItem('waitingServerConnect'));
};

exports.handleMessage = function handleMessage(message) {
    var actionName = message.action;

    if (!actions.hasOwnProperty(actionName)) {
        studio.alert("I don't know about this message: " + actionName);
        return false;
    }
    actions[actionName](message);
};

actions.launchBuild = function(message) {
    var building = {},
        buildingError = {
            android: false,
            ios: false
        },
        tasks = [],
        mobilePath = utils.getMobileProjectPath(),
        platforms = [];
        
    ['android', 'ios'].forEach(function(platform) {
        if (message.params[platform]) {
            platforms.push(platform);
        }
    });
        
    updateDependenciesStatus();

    if (! checkMobileProject()) {
        return;
    }

    if(platforms.indexOf('android') !== -1 && ! checkDependency('android')) {
        utils.printConsole({
            message: '{%span class="red"%}Android SDK dependency not found{%/span%}' + getTroubleShootingLink(dependencies.android)
        });
        return;
    }

    function updateStatus(key, value) {
        building[key] = value;

        var isBuilding = false;
        Object.keys(building).forEach(function(key) {
            isBuilding = building[key] || isBuilding;
        });

        if (isBuilding) {
            fireEvent('build');
        } else {
            fireEvent('buildFinished', { buildingError: buildingError.android || buildingError.ios });
        }
    }

    function tasker() {
        if(! tasks.length) {
            return;
        }

        var task = tasks.shift();
        task.callback.apply(task, task.params instanceof Array ? task.params : [ task.params ]);
    }

    // launch the build after adding the platform
    function build(platform) {
        var platformName = platform === 'android' ? 'Android' : 'iOS';

        studio.hideProgressBarOnStatusBar();
        studio.showProgressBarOnStatusBar('Building your application for ' + platformName + '.');

        var cmd = {
            cmd: 'ionic build ' + platform + ' --release',
            path: mobilePath,
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
                // check if built without error
                if (msg.exitStatus === 0) {
                    if (!buildingError[platform]) {
                        utils.printConsole({
                            type: 'INFO',
                            category: 'build',
                            message: '{%a href="#" onClick="studio.sendCommand(\'wakanda-extension-mobile-core.openBuildFolder.' + Base64.encode(JSON.stringify({ platform: platform })) + '\')"%}Open the generated output for ' + platformName + '{%/a%}' 
                        });
                        studio.hideProgressBarOnStatusBar();
                        studio.showMessageOnStatusBar('Your application build is available for ' + platformName + '.');
                    }
                } else {
                    studio.hideProgressBarOnStatusBar();
                    studio.showMessageOnStatusBar('Build exited with errors! Exit status : ' + msg.exitStatus + '.');
                    buildingError[platform] = true;
                }

                // enable build button when build is terminated
                updateStatus(platform, false);
            }
        };
        utils.executeAsyncCmd(cmd);
    }



    function addPlaformAndBuild(platform) {
        updateStatus(platform, true);
        var cmd = {
            cmd: 'ionic platform add ' + platform,
            path: mobilePath,
            onterminated: function(msg) {
                build(platform);
                tasker();
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
    }
    
    function checkInstalledNodeModules() {
        if(! isIonic2Project() || utils.checkInstalledNodeModules(mobilePath)) {
            tasker();
            return;
        }
        
        if(! utils.isOnline()) {
            var message = 'To build your application, you should have an internet connection to install the required npm dependencies. Please check your internet connection and try again!';
            studio.alert(message);
            utils.printConsole({ TYPE: 'ERROR', message: message });
            return;
        }
        var cmd = {
            cmd: 'npm install',
            path: mobilePath,
            onterminated: function(msg) {
                watchSolutionForlder(true);
                if(msg.exitStatus !== 0) {
                    utils.printConsole({ TYPE: 'ERROR', message: 'Installation of npm dependencies exited with errors!' });        
                }
                updateStatus('installNodeModules', false);
                tasker();
            }  
        };
        updateStatus('installNodeModules', true);
        studio.hideProgressBarOnStatusBar();
        studio.showProgressBarOnStatusBar('Installing npm dependencies...');
        watchSolutionForlder(false);
        utils.executeAsyncCmd(cmd);
    }

    tasks.push({ callback: checkInstalledNodeModules });
    
    platforms.forEach(function(platform) {
        if (message.params[platform]) {
            tasks.push({ callback: addPlaformAndBuild, params: platform });
        }
    });

    tasker();
};

actions.openBuildFolder = function(message) {
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
        webPreview(config);
    } else {
        webAppViewPending(config, 'wakanda-server');
        utils.setStorage({
            name: 'waitingServerConnect',
            value: {
                waiting: true,
                callback: 'webPreview',
                abortCallback: 'webPreviewServerAbort',
                params: config,
                dateTime: new Date().getTime()
            }
        });

        fireEvent('webRunWaitConnectToServer');
        studio.sendCommand('StartWakandaServer');
    }
};

actions.webPreviewServerAbort = function(config) {
    var page = config.webStudioPreview ? 'html/webapp.html' : 'html/webapp-browser.html';
    if(tabIsOpened(page)) {
        closeTab(page);
    }
};

actions.handleOnServerStartAbort = function(message) {
    var storage = utils.getStorage('waitingServerConnect');

    if (! storage.waiting) {
        return;
    }

    fireEvent('startServerAborted');

    utils.setStorage({ 
        name: 'waitingServerConnect',
        value: {
            waiting: false    
        }
    });

    if(storage.abortCallback) {
        if(actions[storage.abortCallback]) {
            actions[storage.abortCallback](storage.params);
        } else {
            utils.printConsole({ type: 'WARN', message: 'Unknown function ' + storage.abortCallback });
        }
    }
};

actions.handleServerConnect = function(message) {
    var storage = utils.getStorage('waitingServerConnect'),
        timeout = 2; // timeout is in seconds unit
        
    if (! storage.waiting) {
        return;
    }

    utils.setStorage({ 
        name: 'waitingServerConnect',
        value: {
            waiting: false    
        }
    });

    var tasks = {
        webPreview: {
            taskName: 'Running web',
            action: webPreview,
            event: 'webRunConnectedToServer'
        },
        ionicPreview: {
            taskName: 'Testing mobile',
            action: actions.ionicPreview,
            event: 'mobileTestConnectedToServer'
        },
        ionicRun: {
            taskName: 'Running mobile',
            action: actions.ionicRun,
            event: 'mobileRunConnectedToServer'
        }
    };

	if(! storage.callback) {
		return;
	}

	if(! tasks[storage.callback]) {
		utils.printConsole({
			type: 'WARN',
			message: 'Unknown callback ' + storage.callback
		});

		return;
	}

	fireEvent(tasks[storage.callback].event);

    // if server is not launched after 2 minutes, do nothing !
    if (new Date().getTime() - storage.dateTime > timeout * 60 * 1000) {
        utils.printConsole({
            type: 'ERROR',
            message: 'Waiting to connect to solution server exceeds ' + timeout + ' seconds, ' + tasks[storage.callback].taskName + ' action is cancelled.'
        });
        return;
    }

	tasks[storage.callback].action(storage.params);
};


function webPreview(config) {
    var projectPath = utils.getWebProjectPath(),
        projectName = utils.getSelectedProjectName(),
        packageJson = studio.File(projectPath + '/package.json'),
        displayed = false,
        options = {
            livereloadPort: utils.getAvailablePort(35729),
            serverUrl: studio.getProjectURL()
        },
        appFolder = studio.File(projectPath + '/app/index.html'),
        webStudioPreview = config.webStudioPreview,
        isWak10Project = ! studio.Folder(projectPath).exists || ! packageJson.exists;

        // default behavior for project < WAK11
        if(isWak10Project) {
            _display(false);
            return;
        }

        updateDependenciesStatus();
        var nodeDependency = checkDependency('node'); 
        if(! nodeDependency) {
            utils.printConsole({
                message: '{%span class="orange"%}Live reloading is currently deactivated. If you want the page to reload automatically after any file changes occur, please install Node.{%/span%}',
                type: 'INFO'
            });

            utils.printConsole({
                message: '{%span class="orange"%}Node: Not Found - Install Node »{%/span%}' + getTroubleShootingLink(dependencies.node),
                type: 'WARNING'
            });

            if(os.isMac) {
                utils.printConsole({
                    message: '{%span class="orange"%}If necessary, you can add custom paths by going to Preferences > Environment variables.{%/span%}',
                    type: 'INFO'
                });
            }
        };

        if (! nodeDependency || ! packageJson.exists) {
            _display(false);

        } else if(utils.checkInstalledNodeModules()) {
            _launchServe();

        } else if(! utils.isOnline()) { // no internet connection
            _display(false);

        } else { // install npm modules
            fireEvent('webInstallingNpmModules');

            studio.hideProgressBarOnStatusBar();
            studio.showProgressBarOnStatusBar('Installing npm dependencies from package.json...');

            var command = {
                cmd: 'npm install',
                path: projectPath,
                onterminated: function(msg) {
                    watchSolutionForlder(true);
                    fireEvent('webInstallingNpmModulesFinished');
                    studio.hideProgressBarOnStatusBar();
                    if (msg.exitStatus === 0) {
                        _launchServe();
                        studio.showMessageOnStatusBar('npm dependencies installed.');
                    } else {
                        _display(false);
                        studio.showMessageOnStatusBar('Installation of npm dependencies exited with errors!');
                    }
                }
            };
            webAppViewPending(config, 'npm install');
            watchSolutionForlder(false);
            utils.executeAsyncCmd(command);
        }

        function _launchServe() {
            var service = utils.getStorage('npm-serve');
            if(service[projectName] && service[projectName]['port']) {
                options.port = service[projectName]['port'];
                _display(true);
                return;
            }

            options.port = utils.getAvailablePort(8000);
            var command = {
                cmd: 'npm start -- -- --serverUrl ' + options.serverUrl + ' --port ' + options.port + ' --livereloadPort ' + options.livereloadPort,
                path: projectPath,
                onmessage: function(msg) {
                    var readyMessages = [
                        "webpack: bundle is now VALID.", /* Webpack */
                        "Server started", /* Gulp */
                        "Compilation complete" /* Lite-server */
                    ];

                    var ready = readyMessages.some(function (message) {
                        if (msg.indexOf(message) > -1) {
                            return true;
                        }
                    });

                    if (!displayed && ready) {
                        displayed = true;
                        _display(true);
                    }

                    utils.setStorage({
                        name: 'npm-serve',
                        key: projectName,
                        value: {
                            pid: worker._systemWorker.getInfos().pid,
                            port: options.port
                        }
                    });

                    if(os.isWindows && msg.indexOf("Starting 'reload'...") !== -1) {
                        studio.sendExtensionWebZoneCommand('wakanda-extension-mobile-core', 'reloadIframes');
                    }
                }
            };
            webAppViewPending(config, 'npm start');
            var worker = utils.executeAsyncCmd(command);
        }

        function _display(livereload) {
            var url = livereload ? 'http://127.0.0.1:' + options.port + '/' : options.serverUrl;

            // to fix cache redirection page when opening pages in Tab in Studio
            // open app/index.html instead of index.html
            if(appFolder.exists && ! livereload) {
                url = url + '/app/';
            }

            if (webStudioPreview) {
                webAppViewTab(config, url);
            } else {
                if(tabIsOpened('html/webapp-browser.html')) {
                    closeTab('html/webapp-browser.html');
                }
                utils.executeAsyncCmd({
                    cmd: os.isWindows ? 'start ' + url : 'open ' + url
                });
            }
            if(tabIsOpened('html/webapp-browser.html')) {
                closeTab('html/webapp-browser.html');
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
    studio.sendCommand('wakanda-extension-mobile-test.listenEvent.' + Base64.encode(JSON.stringify({ eventName: eventName, data: data })));
}

function checkMobileProject() {
    var projectName = utils.getSelectedProjectName(),
        mobilePath = utils.getMobileProjectPath(),
        isIonic2 = isIonic2Project();

    // if no (or more than one) project is selected
    if (! projectName) {
        studio.alert('You must select one and only one project in your Wakanda Solution.');
        return false;
    }

    // check ionic project
    var configPath = File(mobilePath + '/ionic.config.json').exists ? mobilePath + '/ionic.config.json' : mobilePath + '/ionic.project'; 
    if(! File(configPath).exists) {
         studio.alert('Your project ' + projectName + ' is not a mobile project, please select a mobile project.');
         return false;
    }
    
    if(isIonic2 && ! checkDependency('ionic 2')) {
        utils.printConsole({
            message: '{%span class="orange"%}Ionic 2 dependency not found {%/span%}' + getTroubleShootingLink(dependencies['ionic 2']),
            type: 'WARNING'
        });
        return false;
    }
    
    if(! isIonic2 && ! checkDependency('ionic')) {
        utils.printConsole({
            message: '{%span class="orange"%}Ionic dependency not found {%/span%}' + getTroubleShootingLink(dependencies.ionic),
            type: 'WARNING'
        });
        return false;
    }

    return true;
}

actions.buildWebApp = function(message) {
    var projectPath = utils.getSelectedProjectPath();
    var buildPath = studio.currentSolution.getSolutionFile().parent.path + 'build/' + utils.getSelectedProjectName();
    var toExclude = {
        files: [],
        folders: [ projectPath + '/mobile/', projectPath + '/database/data/']
    };

    // delete all file/folders except .git folder
    var folder = Folder(buildPath);
    folder.files.forEach(function(_file) { _file.remove(); });
    folder.folders.forEach(function(_folder) { _folder.name !== '.git' && _folder.remove(); });

    copyFolder(projectPath, buildPath, toExclude);
};

actions.buildAppForDeploy = function(message) {
    actions.buildWebApp(message);
    studio.sendExtensionWebZoneCommand('git', 'buildEnded');
};

actions.launchWebAppBuild = function(message) {
    fireEvent('buildWebApp');
    actions.buildWebApp(message);
    fireEvent('buildWebAppFinished');
};

// copyFolder is a recursive function
// because DirectoryEntrySync that can copy folder is not implemented in the studio
// the function is working in absolute path
function copyFolder(source, destination, toExclude) {
    var folder = new Folder(source);
    if(! folder.exists) {
        return;
    }

    var destFolder = Folder(destination);
    if(! destFolder.exists) {
        destFolder.create();
    }

    toExclude = toExclude || {};

    if(destination.slice(-1) !== '/') {
        destination += '/';
    }

    folder.files.forEach(function(_file) {
        if(toExclude.files && toExclude.files.indexOf(_file.path) === -1) {
            _file.copyTo(destination + _file.name);
        }
    });

    folder.folders.forEach(function(_folder) {
        if(toExclude.folders && toExclude.folders.indexOf(_folder.path) === -1) {
           copyFolder(_folder.path, destination + _folder.name, toExclude);
        }
    });
}
