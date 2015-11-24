document.addEventListener('DOMContentLoaded', function(e) {
    var params = parseStudioTabUrl(),
        iframe = document.getElementById('ionic-iframe');

    // reload button
    document.getElementById('reload').addEventListener('click', function(e) {
        iframe.contentWindow.location.reload(true);
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