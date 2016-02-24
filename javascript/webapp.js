document.addEventListener('DOMContentLoaded', function(e) {
    var iframe = document.getElementById('webapp-iframe'),
    	params = parseStudioTabUrl();

    iframe.src = params.url;

    // reload button for iframe
    document.getElementById('reload').addEventListener('click', function(e) {
        iframe.contentWindow.location.reload(true);
    });

    window.reloadIframes = function() {
        var frameDocument = iframe.contentWindow.document;
        var frames        = frameDocument.getElementsByClassName("frame");
        if(frames.length === 0) {
            iframe.contentWindow.location.reload(true);
        } else {
            Array.prototype.forEach.call(frames, function(frame) {
                frame.contentWindow.location.reload(true);
            });
        }
    }
});
