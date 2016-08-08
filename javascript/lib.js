// generates a common bar for each html view
document.querySelector(".btn-wrapper").innerHTML = ''
    + '<div class="btn-wrapper-cell">'
    +      '<a class="btn btn-undo" title="Back" id="historyBack"></a>'
    +      '<a class="btn btn-redo" title="Forward" id="historyForward"></a>'
    +      '<a class="btn btn-reload" title="Reload" id="reload"></a>'
    +  '</div>'
    +  '<div class="btn-wrapper-cell">'
    +    '<input id="urlBar" type="text" value="" style="visibility:hidden;">'
    +    '<a id="corsWarning" class="btn btn-warning" onclick="studio.extension.openPageInTab(document.getElementById(\'urlBar\').value,document.getElementById(\'urlBar\').value)">'
    +      '<span>!</span>'
    +      '<span class="warning">'
    +          '<b>The page requested couldn\'t be loaded.</b><br>Try to open it in a new tab.'
    +      '</span>'
    +    '</a>'
    +  '</div>';

document.addEventListener('DOMContentLoaded', function(e) {
    // navigation bar logic
    var urlBar = document.getElementById("urlBar");
    var iframe = document.getElementById('wrapper-iframe');
    var iframeHistory = {};
    var corsWarning = document.getElementById("corsWarning");

    iframe.onload = function () {
        iframeHistory = iframe.contentWindow.history;
    };

    urlBar.onchange = function() {
        var historyLength = iframeHistory.length;
        corsWarning.style.display = 'none';
        if (iframe.contentWindow.location.href !== urlBar.value) {
            iframe.contentWindow.location.href = urlBar.value;
            setTimeout(function(){
                if (historyLength === iframeHistory.length) {
                    corsWarning.style.display = 'block';
                    corsWarning.setAttribute('href')
                } else {
                    corsWarning.style.display = 'none';
                }
            },500);
        }
    };

    historyBack.onclick = function() {
        iframeHistory.back();
    }

    historyForward.onclick = function() {
        iframeHistory.forward();
    }

    window.getCurrentPage = function() {
        var page = window.location.href.split('?')[0].split('/').pop();
        return page.replace('.html', '');
    };

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
    };

    window.setPending = function(param) {
        if(getCurrentPage() !== param.selected) {
            return;
        }

        urlBar.style.visibility = 'hidden';

        if(/^file:\/.+pending\.html$/.test(iframe.src)) {
            iframe.contentWindow.document.getElementById('message').innerHTML = param.message;
        } else {
            iframe.src = 'pending.html';
            iframe.addEventListener('load', updateMessage);
        }

        function updateMessage() {
            iframe.contentWindow.document.getElementById('message').innerHTML = param.message;
            iframe.removeEventListener('load', updateMessage);
        }
    };

    window.setIframeSrc = function(param) {
        if(getCurrentPage() !== param.selected) {
            return;
        }
        
        iframe.src = param.url;

        urlBar.style.visibility = 'visible';
        if (urlBar.value != iframe.src) {
            corsWarning.style.display = 'none';
            urlBar.value = iframe.src;
        }
    };

    window.parseStudioTabUrl = function() {
        var url = window.location.href,
            params = {};

        if(url.split('?').length <= 1) {
            return params;
        }

        url.split('?').slice(1).join('?').split('&').forEach(function(element) {
            var arr = element.split('=');
            params[ arr.shift() ] = decodeURIComponent( arr.join('=') );
        });

        return params;
    };

    // reload button for iframe
    document.getElementById('reload').addEventListener('click', function(e) {
        iframe.contentWindow.location.reload(true);
    });

    // handle url params when opening tab
    var params = parseStudioTabUrl();
    switch (params.action) {
        case 'setPending':
            setPending({ message: params.message, selected: params.selected });
            break;
        case 'setIframeSrc':
            setIframeSrc({ url: params.url, selected: params.selected });
            break;
    }
});
