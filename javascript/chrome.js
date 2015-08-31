document.addEventListener('DOMContentLoaded', function(e) {
    "use strict";
    var params = parseStudioTabUrl(),
        iframe = document.getElementById('pending');

    iframe.src = 'pending.html';

    if(! params.url) {
        return;
    }

    if(params.serverLaunched === 'true') {
        studio.sendCommand('closeCurrentTab');
        return;
    }    
    
    // ping if server is running
    pingUrl(params.url, function() { studio.sendCommand('closeCurrentTab'); });

});
