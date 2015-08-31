function parseStudioTabUrl() {
    var url = window.location.href,
        params = {};
    
    if(url.split('?').length <= 1) {
        return params;
    }

    url.split('?').slice(1).join('?').split('&').forEach(function(element) {
        var arr = element.split('=');
        params[ arr[0] ] = decodeURIComponent( arr[1] );
    });

    return params;
}

function pingUrl(url, callback) {
    var limit = 0,
        interval = setInterval(function() {
            limit ++;
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onreadystatechange = function() {
                if(xhr.readyState === 4 && xhr.status === 200) {
                    if(callback) {
                        callback();
                    }
                    clearInterval(interval);
                } else if(limit > 4) {
                    // display a message
                    clearInterval(interval);
                }
            };
            xhr.send(null);
        }, 2000);
}
