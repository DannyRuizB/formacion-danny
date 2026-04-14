// Todas las imagenes disponibles para decoracion
var allImages = [
    'img/dashboard-servidor.png',
    'img/proxmox-panel-vm.png',
    'img/bind9-status.png',
    'img/nginx-web-estatica.png',
    'img/tunel-ssh-terminal.png',
    'img/wiki-nginx-servidor.png',
    'img/bind9-dig-verificacion.png',
    'img/monitor-log-output.png',
    'img/dhcp-server-status.png',
    'img/nginx-reverse-proxy-api.png',
    'img/acceso-ssh-servidor.png',
    'img/ejercicio-2.2-red-configurada.png',
    'img/ejercicio-2.4-crontab.png',
    'img/analisis-logs-auth-nginx.png',
    'img/logrotate-monitor.png',
    'img/miapi-systemd-status.png',
    'img/crontab-monitor-added.png',
    'img/tunel-ssh-nginx-navegador.png'
];

// Posiciones predefinidas
var positions = [
    { side: 'left',  offset: '-30px', top: '100px',  rotate: -12 },
    { side: 'left',  offset: '-20px', top: '270px',  rotate: 8 },
    { side: 'left',  offset: '-35px', top: '440px',  rotate: -15 },
    { side: 'left',  offset: '-25px', top: '610px',  rotate: 10 },
    { side: 'left',  offset: '-30px', top: '780px',  rotate: -8 },
    { side: 'right', offset: '-30px', top: '130px',  rotate: 14 },
    { side: 'right', offset: '-20px', top: '300px',  rotate: -10 },
    { side: 'right', offset: '-35px', top: '470px',  rotate: 12 },
    { side: 'right', offset: '-25px', top: '640px',  rotate: -13 },
    { side: 'right', offset: '-30px', top: '810px',  rotate: 9 }
];

function getPageImageNames() {
    var imgs = document.querySelectorAll('.md-content img');
    var names = [];
    for (var i = 0; i < imgs.length; i++) {
        var src = imgs[i].getAttribute('src') || '';
        // Coger solo el nombre del fichero
        var filename = src.split('/').pop();
        if (filename) names.push(filename);
    }
    return names;
}

function buildDecorations() {
    var container = document.getElementById('deco-container');
    if (!container) return;
    container.innerHTML = '';

    var pageImageNames = getPageImageNames();

    // Calcular base path segun profundidad de la URL
    var path = window.location.pathname;
    var depth = path.split('/').filter(function(p) { return p.length > 0; }).length;
    var basePath = '';
    for (var d = 0; d < depth; d++) basePath += '../';

    for (var i = 0; i < positions.length && i < allImages.length; i++) {
        var pos = positions[i];
        var imgPath = allImages[i];
        var filename = imgPath.split('/').pop();

        // Comprobar si esta imagen esta en la pagina actual
        var isOnPage = pageImageNames.indexOf(filename) !== -1;

        var div = document.createElement('div');
        div.className = 'deco-polaroid' + (isOnPage ? ' deco-hidden' : '');
        div.style.backgroundImage = 'url(' + basePath + imgPath + ')';
        div.style.top = pos.top;
        div.style.transform = 'rotate(' + pos.rotate + 'deg)';

        if (pos.side === 'left') {
            div.style.left = pos.offset;
        } else {
            div.style.right = pos.offset;
        }

        container.appendChild(div);
    }
}

// Ejecutar al cargar
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(buildDecorations, 200);
});

// Para navegacion instantanea de MkDocs Material
var checkInterval = setInterval(function() {
    if (typeof location !== 'undefined') {
        var lastPath = '';
        setInterval(function() {
            if (window.location.pathname !== lastPath) {
                lastPath = window.location.pathname;
                setTimeout(buildDecorations, 300);
            }
        }, 500);
        clearInterval(checkInterval);
    }
}, 100);
