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

    var path = window.location.pathname;
    var depth = path.split('/').filter(function(p) { return p.length > 0; }).length;
    var basePath = '';
    for (var d = 0; d < depth; d++) basePath += '../';

    for (var i = 0; i < positions.length && i < allImages.length; i++) {
        var pos = positions[i];
        var imgPath = allImages[i];
        var filename = imgPath.split('/').pop();

        var isOnPage = pageImageNames.indexOf(filename) !== -1;

        var div = document.createElement('div');
        div.className = 'deco-polaroid';
        div.style.backgroundImage = 'url(' + basePath + imgPath + ')';
        div.style.top = pos.top;
        div.style.transform = 'rotate(' + pos.rotate + 'deg)';

        // Marcar las que tienen imagen en la pagina para el vuelo
        if (isOnPage) {
            div.setAttribute('data-match-file', filename);
        }

        if (pos.side === 'left') {
            div.style.left = pos.offset;
        } else {
            div.style.right = pos.offset;
        }

        container.appendChild(div);
    }
}

// ===== VUELO DE POLAROIDS =====

var flyObserver = null;
var imgPolaroidMap = [];

function setupFlyingPolaroids() {
    if (flyObserver) flyObserver.disconnect();
    imgPolaroidMap = [];

    var container = document.getElementById('deco-container');
    if (!container) return;

    var contentImgs = document.querySelectorAll('.md-content img');
    var polaroids = container.querySelectorAll('.deco-polaroid[data-match-file]');

    if (polaroids.length === 0) return;

    for (var i = 0; i < contentImgs.length; i++) {
        var img = contentImgs[i];
        var src = img.getAttribute('src') || '';
        var filename = src.split('/').pop();
        if (!filename) continue;

        for (var j = 0; j < polaroids.length; j++) {
            if (polaroids[j].getAttribute('data-match-file') === filename) {
                imgPolaroidMap.push({
                    img: img,
                    polaroid: polaroids[j],
                    flown: false
                });
                // Ocultar la imagen del contenido hasta que llegue la polaroid
                img.classList.add('fly-target');
                break;
            }
        }
    }

    if (imgPolaroidMap.length === 0) return;

    flyObserver = new IntersectionObserver(function(entries) {
        for (var k = 0; k < entries.length; k++) {
            if (!entries[k].isIntersecting) continue;
            for (var m = 0; m < imgPolaroidMap.length; m++) {
                if (imgPolaroidMap[m].img === entries[k].target && !imgPolaroidMap[m].flown) {
                    imgPolaroidMap[m].flown = true;
                    flyPolaroid(imgPolaroidMap[m]);
                    flyObserver.unobserve(entries[k].target);
                    break;
                }
            }
        }
    }, { threshold: 0.2 });

    for (var n = 0; n < imgPolaroidMap.length; n++) {
        flyObserver.observe(imgPolaroidMap[n].img);
    }
}

function flyPolaroid(mapping) {
    var pol = mapping.polaroid;
    var img = mapping.img;

    var polRect = pol.getBoundingClientRect();
    var imgRect = img.getBoundingClientRect();

    // Convertir polaroids con right a left para poder animar
    if (pol.style.right && pol.style.right !== 'auto') {
        pol.style.left = polRect.left + 'px';
        pol.style.right = 'auto';
    } else {
        pol.style.left = polRect.left + 'px';
    }
    pol.style.top = polRect.top + 'px';

    // Forzar reflow para que coja la posicion inicial
    pol.offsetHeight;

    // Subir z-index y activar transicion
    pol.style.zIndex = '100';
    pol.style.transition = 'left 0.8s cubic-bezier(0.22, 1, 0.36, 1), ' +
        'top 0.8s cubic-bezier(0.22, 1, 0.36, 1), ' +
        'width 0.8s cubic-bezier(0.22, 1, 0.36, 1), ' +
        'height 0.8s cubic-bezier(0.22, 1, 0.36, 1), ' +
        'transform 0.8s cubic-bezier(0.22, 1, 0.36, 1), ' +
        'border-radius 0.8s ease, ' +
        'border 0.8s ease, ' +
        'box-shadow 0.8s ease';

    // Volar hasta la imagen
    pol.style.left = imgRect.left + 'px';
    pol.style.top = imgRect.top + 'px';
    pol.style.width = imgRect.width + 'px';
    pol.style.height = imgRect.height + 'px';
    pol.style.transform = 'rotate(0deg)';
    pol.style.borderRadius = '6px';
    pol.style.border = '1px solid rgba(255,255,255,0.1)';
    pol.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';

    // Al llegar: mostrar imagen real, desvanecer polaroid
    setTimeout(function() {
        img.classList.add('fly-target-visible');
        pol.style.transition = 'opacity 0.4s ease';
        pol.style.opacity = '0';
        setTimeout(function() {
            pol.style.display = 'none';
        }, 400);
    }, 850);
}

// ===== ANIMACIONES SCROLL =====

var scrollObserver = null;

function setupScrollAnimations() {
    if (scrollObserver) scrollObserver.disconnect();

    var staggerSelectors = '.cards-grid, .services-grid, .extras-grid';
    var fadeSelectors = '.hero, .progress-overview, .md-content h2, .md-content pre, .md-content > .highlight, .md-content table:not([class])';

    var staggerEls = document.querySelectorAll(staggerSelectors);
    for (var i = 0; i < staggerEls.length; i++) {
        staggerEls[i].classList.add('fade-in-stagger');
        staggerEls[i].classList.remove('visible');
    }

    var fadeEls = document.querySelectorAll(fadeSelectors);
    for (var j = 0; j < fadeEls.length; j++) {
        fadeEls[j].classList.add('fade-in');
        fadeEls[j].classList.remove('visible');
    }

    var allEls = document.querySelectorAll('.fade-in, .fade-in-stagger');
    if (allEls.length === 0) return;

    scrollObserver = new IntersectionObserver(function(entries) {
        for (var k = 0; k < entries.length; k++) {
            if (entries[k].isIntersecting) {
                entries[k].target.classList.add('visible');
                scrollObserver.unobserve(entries[k].target);
            }
        }
    }, { threshold: 0.15 });

    for (var m = 0; m < allEls.length; m++) {
        scrollObserver.observe(allEls[m]);
    }
}

// ===== INICIALIZACION =====

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(buildDecorations, 200);
    setTimeout(setupScrollAnimations, 250);
    setTimeout(setupFlyingPolaroids, 300);
});

// ===== SECRETS =====

(function() {
    var s = document.createElement('style');
    s.textContent = '@keyframes rainbow-hue { 0%{filter:hue-rotate(0)} 100%{filter:hue-rotate(360deg)} }';
    document.head.appendChild(s);

    console.log('%c  Servy is watching.  ', 'background:#1e1e2e;color:#9ece6a;font-family:monospace;font-size:14px;padding:6px 10px;border-radius:4px;border:1px solid #9ece6a');
    console.log('%c  Hay secretos escondidos en este laboratorio. Buena suerte encontrandolos.', 'color:#bb9af7;font-style:italic;font-size:11px');

    var seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    var idx = 0;
    var clicks = 0;
    var clickTimer = null;

    function keyMatches(k, ref) {
        if (!k || !ref) return false;
        if (k === ref) return true;
        // Fallback para navegadores antiguos: "Up" en vez de "ArrowUp"
        var aliases = { 'Up': 'ArrowUp', 'Down': 'ArrowDown', 'Left': 'ArrowLeft', 'Right': 'ArrowRight' };
        if (aliases[k] === ref) return true;
        return (k.length === 1 && k.toLowerCase() === ref.toLowerCase());
    }

    document.addEventListener('keydown', function(e) {
        var k = e.key;
        if (keyMatches(k, seq[idx])) {
            idx++;
            if (idx === seq.length) {
                idx = 0;
                console.log('%c[konami] fiesta!', 'color:#bb9af7');
                fiesta();
            }
        } else {
            // Reset, pero si la tecla fallada es el primer paso, arrancar en 1
            idx = keyMatches(k, seq[0]) ? 1 : 0;
        }

        if (e.ctrlKey && e.shiftKey && e.key && e.key.toLowerCase() === 'e') {
            e.preventDefault();
            flash('Eres de los que leen el codigo. Bienvenido al club.');
        }
    });

    document.addEventListener('click', function(e) {
        if (!e.target || e.target.tagName !== 'H1') return;
        clicks++;
        clearTimeout(clickTimer);
        clickTimer = setTimeout(function() { clicks = 0; }, 1500);
        if (clicks >= 7) {
            clicks = 0;
            e.target.style.animation = 'rainbow-hue 1.2s linear 4';
            setTimeout(function() { e.target.style.animation = ''; }, 5000);
        }
    });

    function fiesta() {
        var chars = ['*','#','+','o','@','$','%','~','&'];
        var colors = ['#7aa2f7','#bb9af7','#9ece6a','#e0af68','#f7768e','#7dcfff','#ff9e64'];
        for (var i = 0; i < 90; i++) {
            var p = document.createElement('div');
            p.textContent = chars[Math.floor(Math.random() * chars.length)];
            p.style.cssText = 'position:fixed;top:-40px;left:' + (Math.random() * 100) + '%;font-size:' + (16 + Math.random() * 22) + 'px;font-weight:bold;color:' + colors[Math.floor(Math.random() * colors.length)] + ';pointer-events:none;z-index:99999;transition:transform 3.2s linear, opacity 3.2s;';
            document.body.appendChild(p);
            (function(el, dx) {
                setTimeout(function() {
                    el.style.transform = 'translateY(' + (window.innerHeight + 80) + 'px) translateX(' + dx + 'px) rotate(' + (Math.random() * 720) + 'deg)';
                    el.style.opacity = '0';
                }, 10 + Math.random() * 300);
                setTimeout(function() { el.remove(); }, 3600);
            })(p, (Math.random() - 0.5) * 240);
        }
    }

    function flash(msg) {
        var o = document.createElement('div');
        o.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);background:#1e1e2e;color:#7aa2f7;padding:14px 22px;border-radius:10px;border:1px solid #bb9af7;z-index:99999;font-family:monospace;box-shadow:0 4px 20px rgba(0,0,0,0.5);transition:opacity 1s;';
        o.textContent = msg;
        document.body.appendChild(o);
        setTimeout(function() { o.style.opacity = '0'; }, 2800);
        setTimeout(function() { o.remove(); }, 3900);
    }
})();

// Navegacion instantanea de MkDocs Material
var checkInterval = setInterval(function() {
    if (typeof location !== 'undefined') {
        var lastPath = '';
        setInterval(function() {
            if (window.location.pathname !== lastPath) {
                lastPath = window.location.pathname;
                setTimeout(buildDecorations, 300);
                setTimeout(setupScrollAnimations, 350);
                setTimeout(setupFlyingPolaroids, 400);
            }
        }, 500);
        clearInterval(checkInterval);
    }
}, 100);
