document.addEventListener('DOMContentLoaded', function(e) {
    var params = parseStudioTabUrl(),
        iframe = document.getElementById('ionic-iframe');

    // to call it via studio.sendExtensionWebZoneCommand
    window.reloadIframes = function(){
        var ionicDocument = iframe.contentWindow.document;
        var frames        = ionicDocument.getElementsByClassName("frame");
        Array.prototype.forEach.call(frames, function(frame){
            frame.contentWindow.location.reload(true);
        });
    }

    // reload button
    document.getElementById('reload').addEventListener('click', function(e) {
        window.reloadIframes();
    });

    if(! params.url) {
        return;
    }

    if(params.serverLaunched === 'true') {
        iframe.src = params.url;
        return;
    }    
    
    // ping if server is running
    iframe.src = 'pending.html';
    pingUrl(params.url, function() { iframe.src = params.url; });
});