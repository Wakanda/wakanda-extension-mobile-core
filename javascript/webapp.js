document.addEventListener('DOMContentLoaded', function(e) {
    var iframe = document.getElementById('webapp-iframe'),
    	params = parseStudioTabUrl();

    iframe.src = params.url;
    
    // reload button for iframe
    document.getElementById('reload').addEventListener('click', function(e) {
        iframe.contentWindow.location.reload(true);
    });
});