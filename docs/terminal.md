# Terminal

<div class="terminal-wrapper" onclick="document.getElementById('term-input').focus()">
  <div class="terminal-crt" id="term-screen">
    <div id="term-output"></div>
    <div id="term-prompt" style="display:none">
      <span class="term-ps1">danny@practicas:~$ </span><span id="term-line"></span><span class="term-cursor"></span>
    </div>
  </div>
  <input id="term-input" autocomplete="off" spellcheck="false" />
</div>

<style>
.terminal-wrapper {
  position: relative;
  margin: 20px 0;
  cursor: text;
}
.terminal-crt {
  background: #0a0a0a;
  color: #33ff33;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 0.95em;
  line-height: 1.4;
  padding: 30px 25px;
  border-radius: 18px;
  height: 520px;
  overflow-y: auto;
  box-shadow: 0 0 25px #33ff3355, inset 0 0 40px #33ff3322, 0 10px 30px rgba(0,0,0,0.5);
  position: relative;
  text-shadow: 0 0 3px #33ff30bb;
  animation: crt-flicker 0.15s infinite alternate;
  border: 2px solid #1a1a1a;
}
.terminal-crt::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0, rgba(0,0,0,0.18) 1px, transparent 1px, transparent 3px);
  pointer-events: none;
  z-index: 2;
  border-radius: 18px;
}
.terminal-crt::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%);
  pointer-events: none;
  z-index: 1;
  border-radius: 18px;
}
.terminal-crt > * {
  position: relative;
  z-index: 3;
}
@keyframes crt-flicker {
  0% { opacity: 1; }
  100% { opacity: 0.97; }
}
.term-ps1 { color: #7aff7a; }
.term-cursor {
  display: inline-block;
  width: 0.6em;
  height: 1em;
  background: #33ff33;
  vertical-align: text-bottom;
  animation: term-blink 1s infinite;
  box-shadow: 0 0 5px #33ff33;
}
@keyframes term-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
.term-line { white-space: pre-wrap; word-break: break-word; }
.term-error { color: #ff5555; text-shadow: 0 0 3px #ff5555bb; }
.term-warn { color: #ffb000; text-shadow: 0 0 3px #ffb000bb; }
.term-ok { color: #7aff7a; }
.term-dim { color: #229922; }
#term-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 1px; height: 1px;
}
.terminal-crt::-webkit-scrollbar { width: 8px; }
.terminal-crt::-webkit-scrollbar-track { background: #0a0a0a; }
.terminal-crt::-webkit-scrollbar-thumb { background: #33ff3355; border-radius: 4px; }
</style>

<script>
(function() {
  var out = document.getElementById('term-output');
  var prompt = document.getElementById('term-prompt');
  var line = document.getElementById('term-line');
  var input = document.getElementById('term-input');
  var screen = document.getElementById('term-screen');
  var history = [];
  var histIdx = 0;
  var buffer = '';
  var locked = true;

  function escape(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function println(text, cls) {
    var div = document.createElement('div');
    div.className = 'term-line' + (cls ? ' ' + cls : '');
    div.innerHTML = text;
    out.appendChild(div);
    screen.scrollTop = screen.scrollHeight;
  }

  function printlns(lines, cls) {
    lines.forEach(function(l) { println(escape(l), cls); });
  }

  function typewriter(lines, speed, done) {
    var i = 0;
    function next() {
      if (i >= lines.length) { if (done) done(); return; }
      var item = lines[i++];
      if (typeof item === 'number') { setTimeout(next, item); return; }
      var text = item.text || item;
      var cls = item.cls || null;
      println(text, cls);
      setTimeout(next, speed);
    }
    next();
  }

  // Secuencia de arranque
  var bootSeq = [
    '<span class="term-dim">ZATACA BIOS v1.0 - (C) 2026 Zataca Systems</span>',
    '<span class="term-dim">Detectando hardware...</span>',
    { text: 'CPU: qemu64 x86_64 @ 2.4GHz [OK]', cls: 'term-ok' },
    { text: 'Memoria: 2048 MB [OK]', cls: 'term-ok' },
    { text: 'Disco: 32 GB [OK]', cls: 'term-ok' },
    { text: 'Red: ens18 UP [OK]', cls: 'term-ok' },
    300,
    '<span class="term-dim">Cargando kernel Linux 6.1.0...</span>',
    '<span class="term-dim">Montando /dev/sda1 en /...</span>',
    '<span class="term-dim">Iniciando systemd...</span>',
    { text: 'Servicios arrancados: nginx, named, isc-dhcp-server, ssh, cron, miapi', cls: 'term-ok' },
    300,
    '&nbsp;',
    '<span class="term-ok">Bienvenido a practicas.local</span>',
    'Debian GNU/Linux 13 (Trixie) - cliente1',
    '&nbsp;',
    'Escribe <span class="term-ok">help</span> para ver los comandos disponibles.',
    '&nbsp;'
  ];

  var COMANDOS = {
    help: function() {
      println('Comandos disponibles:');
      println('&nbsp;');
      println('  <span class="term-ok">help</span>       Muestra esta ayuda');
      println('  <span class="term-ok">whoami</span>     Muestra el usuario actual');
      println('  <span class="term-ok">about</span>      Informacion sobre Danny');
      println('  <span class="term-ok">progreso</span>   Estado del curso FCT');
      println('  <span class="term-ok">neofetch</span>   Info del sistema con ASCII art');
      println('  <span class="term-ok">ls</span>         Lista ficheros');
      println('  <span class="term-ok">cat</span> &lt;f&gt;    Muestra el contenido de un fichero');
      println('  <span class="term-ok">ping</span> &lt;h&gt;   Envia paquetes ICMP a un host');
      println('  <span class="term-ok">date</span>       Fecha y hora actual');
      println('  <span class="term-ok">uptime</span>     Tiempo de encendido');
      println('  <span class="term-ok">clear</span>      Limpia la pantalla');
      println('  <span class="term-ok">exit</span>       Cierra la sesion');
    },
    whoami: function() {
      println('danny (Danny Ruiz Boluda)');
      println('<span class="term-dim">Grupos: danny, sudo, zataca</span>');
      println('<span class="term-dim">FCT en Zataca Systems - 2026</span>');
    },
    about: function() {
      println('<span class="term-ok">=== Danny Ruiz Boluda ===</span>');
      println('&nbsp;');
      println('Alumno de FCT en Zataca Systems.');
      println('Aprendiendo administracion de sistemas Linux,');
      println('virtualizacion con Proxmox, redes, Docker y');
      println('desarrollo de automatizaciones.');
      println('&nbsp;');
      println('<span class="term-dim">"La mejor forma de aprender es romper cosas y arreglarlas."</span>');
    },
    progreso: function() {
      var modulos = [
        { nombre: 'Modulo 1 - Introduccion', pct: 100 },
        { nombre: 'Modulo 2 - Administracion', pct: 100 },
        { nombre: 'Modulo 3 - Redes y servicios', pct: 100 },
        { nombre: 'Modulo 4 - Virtualizacion y contenedores', pct: 100 },
        { nombre: 'Modulo 5 - Bases de datos', pct: 100 },
        { nombre: 'Modulo 6 - Seguridad', pct: 100 },
        { nombre: 'Modulo 7-8 - Pendientes', pct: 0 }
      ];
      println('<span class="term-ok">=== Progreso FCT ===</span>');
      println('&nbsp;');
      modulos.forEach(function(m) {
        var bloques = Math.round(m.pct / 5);
        var bar = '';
        for (var i = 0; i < 20; i++) bar += i < bloques ? '#' : '-';
        var cls = m.pct === 100 ? 'term-ok' : (m.pct > 0 ? 'term-warn' : 'term-dim');
        println('<span class="' + cls + '">[' + bar + '] ' + m.pct + '%  ' + escape(m.nombre) + '</span>');
      });
    },
    neofetch: function() {
      var art = [
        '       _,met$$$$$gg.      ',
        '    ,g$$$$$$$$$$$$$$$P.   ',
        '  ,g$$P"        """Y$$.". ',
        ' ,$$P\'              `$$$. ',
        '\',$$P       ,ggs.     `$$b:',
        '`d$$\'     ,$P"\'   .    $$$ ',
        ' $$P      d$\'     ,    $$P ',
        ' $$:      $$.   -    ,d$$\' ',
        ' $$;      Y$b._   _,d$P\'   ',
        ' Y$$.    `.`"Y$$$$P"\'      ',
        ' `$$b      "-.__           ',
        '  `Y$$                     ',
        '   `Y$$.                   ',
        '     `$$b.                 ',
        '       `Y$$b.              ',
        '          `"Y$b._          ',
        '              `"""         '
      ];
      var info = [
        '',
        '<span class="term-ok">danny</span>@<span class="term-ok">practicas</span>',
        '---------------',
        '<span class="term-ok">OS:</span> Debian 13 Trixie x86_64',
        '<span class="term-ok">Host:</span> cliente1 (VM 1002)',
        '<span class="term-ok">Kernel:</span> 6.1.0-amd64',
        '<span class="term-ok">Uptime:</span> infinita ;)',
        '<span class="term-ok">Shell:</span> bash 5.2.15',
        '<span class="term-ok">CPU:</span> qemu64 (4) @ 2.4GHz',
        '<span class="term-ok">Memoria:</span> 512 / 2048 MB',
        '<span class="term-ok">Red:</span> 10.160.218.20/24',
        '<span class="term-ok">FCT:</span> Modulos 1-4 completos'
      ];
      for (var i = 0; i < Math.max(art.length, info.length); i++) {
        var a = art[i] || '                           ';
        var b = info[i] || '';
        println('<span class="term-ok">' + escape(a) + '</span>  ' + b);
      }
    },
    ls: function(args) {
      var dir = args[0];
      if (dir === 'proyectos' || dir === 'proyectos/') {
        println('<span class="term-ok">dashboard</span>  <span class="term-ok">wiki</span>  <span class="term-ok">monitor</span>  <span class="term-ok">backups</span>  <span class="term-ok">docker</span>');
        return;
      }
      if (dir) {
        println('ls: no se puede acceder a \'' + escape(dir) + '\': No existe', 'term-error');
        return;
      }
      println('<span class="term-ok">proyectos</span>/  readme.txt  about.txt  skills.txt  contacto.txt');
    },
    cat: function(args) {
      if (!args[0]) { println('cat: falta operando', 'term-error'); return; }
      var files = {
        'readme.txt': [
          '# Laboratorio de practicas - Danny',
          '',
          'Este laboratorio contiene toda la infraestructura montada',
          'durante las FCT en Zataca Systems: un hipervisor Proxmox',
          'con varias VMs Debian, servicios de red (DNS, DHCP, web)',
          'y automatizacion con dashboards en tiempo real.',
          '',
          'Ver arquitectura-laboratorio para el esquema completo.'
        ],
        'about.txt': [
          'Alumno: Danny Ruiz Boluda',
          'Curso: FCT Zataca Systems 2026',
          'Tutor: Adrian Rodrigo Melon Gutte',
          'Duracion: 400h (16 marzo - 5 junio 2026)'
        ],
        'skills.txt': [
          'Linux administracion    ##########',
          'Proxmox / KVM           #######---',
          'Redes (DNS, DHCP, NAT)  ##########',
          'Nginx / Apache          ########--',
          'Bash scripting          ##########',
          'Docker                  ######----',
          'Node.js / Express       #######---',
          'Git                     ########--'
        ],
        'contacto.txt': [
          'Email:    danny@zataca.com',
          'Empresa:  Zataca Systems',
          'LinkedIn: [configurar]',
          'GitHub:   [configurar]'
        ]
      };
      var f = args[0].replace(/^\.\//, '');
      if (files[f]) {
        printlns(files[f]);
      } else if (f.endsWith('/') || f === 'proyectos') {
        println('cat: ' + escape(f) + ': Es un directorio', 'term-error');
      } else {
        println('cat: ' + escape(f) + ': No existe', 'term-error');
      }
    },
    ping: function(args) {
      var host = args[0] || 'practicas.local';
      println('PING ' + escape(host) + ' (10.160.218.20) 56(84) bytes');
      var seq = 0;
      function tick() {
        if (seq >= 4) {
          println('&nbsp;');
          println('--- ' + escape(host) + ' ping statistics ---');
          println('4 paquetes transmitidos, 4 recibidos, 0% perdidos');
          unlock();
          return;
        }
        var t = (Math.random() * 2 + 0.3).toFixed(2);
        println('64 bytes desde ' + escape(host) + ': icmp_seq=' + (++seq) + ' ttl=64 tiempo=' + t + ' ms');
        setTimeout(tick, 600);
      }
      locked = true;
      prompt.style.display = 'none';
      setTimeout(tick, 400);
      return true;
    },
    date: function() {
      println(new Date().toString());
    },
    uptime: function() {
      println(' ' + new Date().toLocaleTimeString('es-ES') + ' up infinito, 1 user, load average: 0.00, 0.00, 0.00');
    },
    clear: function() {
      out.innerHTML = '';
    },
    exit: function() {
      println('<span class="term-warn">logout</span>');
      println('Connection to practicas closed.');
      locked = true;
      prompt.style.display = 'none';
    }
  };

  // Alias
  COMANDOS['cv'] = COMANDOS.about;

  // Comandos secretos (no salen en help)
  COMANDOS['42'] = function() {
    locked = true;
    prompt.style.display = 'none';
    setTimeout(function() { println('<span class="term-dim">Pensando...</span>'); }, 200);
    setTimeout(function() { println('<span class="term-dim">Pensando mucho...</span>'); }, 1200);
    setTimeout(function() { println('<span class="term-dim">Pensando muchisimo...</span>'); }, 2400);
    setTimeout(function() {
      println('<span class="term-ok">La Respuesta a la Gran Pregunta de la Vida, el Universo y Todo.</span>');
      unlock();
    }, 3600);
    return true;
  };
  COMANDOS.coffee = function() {
    println('      ( (   ');
    println('       ) )  ');
    println('    ........');
    println('    |      |]  <span class="term-warn">cafe servido</span>');
    println('    \\      /');
    println('     `----\'');
  };
  COMANDOS.cowsay = function(args) {
    var msg = args.join(' ') || 'Muu!';
    var bar = '';
    for (var i = 0; i < msg.length + 2; i++) bar += '-';
    println(' ' + bar);
    println('< ' + escape(msg) + ' >');
    println(' ' + bar);
    println('        \\   ^__^');
    println('         \\  (oo)\\_______');
    println('            (__)\\       )\\/\\');
    println('                ||----w |');
    println('                ||     ||');
  };
  COMANDOS.fortune = function() {
    var frases = [
      'El mejor sysadmin es el que nunca hace falta.',
      'Un servidor feliz es un servidor bien monitorizado.',
      'No hay bug, solo funcionalidad no documentada.',
      'Todo lo que puede fallar, fallara en produccion a las 3am.',
      'grep -i amor /dev/null  # tambien sin resultados',
      'sudo make me a sandwich  # Okay.',
      'La paciencia es la virtud del que compila.',
      'rm -rf no es un plan de recuperacion.',
      'Los backups son una religion. Los restores son el milagro.'
    ];
    println('<span class="term-warn">' + escape(frases[Math.floor(Math.random() * frases.length)]) + '</span>');
  };
  COMANDOS.matrix = function() {
    locked = true;
    prompt.style.display = 'none';
    var lines = 20;
    var i = 0;
    function tick() {
      if (i >= lines) {
        println('<span class="term-ok">La matrix te ha visto.</span>');
        unlock();
        return;
      }
      var line = '';
      for (var j = 0; j < 60; j++) {
        line += Math.random() < 0.35 ? String.fromCharCode(33 + Math.floor(Math.random() * 94)) : ' ';
      }
      println('<span class="term-ok">' + escape(line) + '</span>');
      i++;
      setTimeout(tick, 120);
    }
    tick();
    return true;
  };
  COMANDOS.hack = function(args) {
    var target = args[0] || '10.160.218.254';
    locked = true;
    prompt.style.display = 'none';
    var pasos = [
      '[*] Escaneando puertos en ' + target + '...',
      '[+] Puerto 22/tcp abierto',
      '[+] Puerto 80/tcp abierto',
      '[*] Probando exploits...',
      '[*] Bypass de firewall...',
      '[*] Ejecutando payload...',
      '[+] Shell remota obtenida',
      '[!] Acceso root concedido'
    ];
    var i = 0;
    function tick() {
      if (i >= pasos.length) {
        setTimeout(function() {
          println('<span class="term-warn">...es broma, no has hackeado nada. Es una terminal simulada ;)</span>');
          unlock();
        }, 800);
        return;
      }
      println('<span class="term-dim">' + escape(pasos[i]) + '</span>');
      i++;
      setTimeout(tick, 500 + Math.random() * 400);
    }
    tick();
    return true;
  };
  COMANDOS.sudo = function(args) {
    if (args[0] === 'make' && args[1] === 'me' && args[2] === 'a' && args[3] === 'sandwich') {
      println('<span class="term-warn">Okay.</span>');
      println('<span class="term-dim">(referencia obligatoria a xkcd)</span>');
      return;
    }
    println('sudo: solo funciona para ciertos comandos aqui', 'term-error');
  };
  COMANDOS.beer = function() {
    println('   oO Oo                 ');
    println('    oOo                   ');
    println('   .-=-.                  ');
    println('   |~~~|                  ');
    println('   |~~~|    <span class="term-warn">Una birra fria.</span>');
    println('   |~~~|    <span class="term-dim">Sysadmin mode: offline.</span>');
    println('   \'---\'                  ');
  };
  COMANDOS.flip = function(args) {
    var item = args.join(' ') || 'mesa';
    println('(&#9583;&deg;&#9633;&deg;)&#9583;&#65077; &#9531;&#9473;&#9531;');
    println('<span class="term-warn">&iexcl;' + escape(item.toUpperCase()) + ' VOLTEADA!</span>');
    println('<span class="term-dim">respira, cuenta hasta 10, vuelve a intentarlo.</span>');
  };
  COMANDOS.dadjoke = function() {
    var chistes = [
      'Hay 10 tipos de personas: las que entienden binario y las que no.',
      'Un paquete UDP entra en un bar. El bar no acusa recibo.',
      '99 bugs en el codigo, 99 bugs. Arreglas uno, compilas otra vez, 127 bugs en el codigo.',
      'Un SSH y un SFTP entran en un puerto. El 22 los saluda.',
      'El DNS funciona. Siempre es el DNS. Nunca es el DNS. Siempre es el DNS.',
      'Mi script funciona en mi maquina. Te presto mi maquina.',
      'Los ingenieros cuentan desde 0 porque no quieren empezar con problemas.'
    ];
    println('<span class="term-warn">' + escape(chistes[Math.floor(Math.random() * chistes.length)]) + '</span>');
  };
  COMANDOS.disco = function() {
    locked = true;
    prompt.style.display = 'none';
    var colores = ['#ff5555', '#ffb86c', '#f1fa8c', '#50fa7b', '#8be9fd', '#bd93f9', '#ff79c6'];
    var etiquetas = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'CYAN', 'PURPLE', 'PINK'];
    var bloque = '';
    for (var b = 0; b < 10; b++) bloque += '&#9608;';
    var pasos = 20;
    var i = 0;
    function tick() {
      if (i >= pasos) {
        println('<span class="term-warn">La fiesta siempre acaba. back to work.</span>');
        unlock();
        return;
      }
      var c = colores[i % colores.length];
      var t = etiquetas[i % etiquetas.length];
      println('<span style="color:' + c + ';text-shadow:0 0 8px ' + c + 'bb">' + bloque + ' ~ ' + t + ' ~ ' + bloque + '</span>');
      i++;
      setTimeout(tick, 180);
    }
    tick();
    return true;
  };
  COMANDOS.konami = function() {
    println('<span class="term-warn">El codigo Konami vive fuera de esta terminal.</span>');
    println('<span class="term-dim">Pulsa &uarr;&uarr;&darr;&darr;&larr;&rarr;&larr;&rarr;BA en cualquier pagina de la wiki.</span>');
    println('<span class="term-dim">(pista: necesitas el foco fuera de la terminal)</span>');
  };

  function runCommand(raw) {
    var trimmed = raw.trim();
    if (!trimmed) return;

    // Easter eggs
    if (/^sudo\s+rm\s+-rf\s+\/?\s*$/.test(trimmed)) {
      locked = true;
      prompt.style.display = 'none';
      var frames = [
        { text: '[ ADVERTENCIA ] Borrando / ...', cls: 'term-error' },
        '[*] Eliminando /bin ...',
        '[*] Eliminando /etc ...',
        '[*] Eliminando /home ...',
        '[*] Eliminando /var ...',
        '[*] Eliminando /usr ...',
        1000,
        '[*] Eliminando el universo ...',
        1500,
        { text: 'nope ;)', cls: 'term-warn' },
        { text: 'Relajate, esto es una terminal simulada.', cls: 'term-dim' }
      ];
      typewriter(frames, 250, unlock);
      return true;
    }

    var parts = trimmed.split(/\s+/);
    var cmd = parts[0];
    var args = parts.slice(1);
    var fn = COMANDOS[cmd];
    if (!fn) {
      println(escape(cmd) + ': comando no encontrado. Prueba <span class="term-ok">help</span>.', 'term-error');
      return;
    }
    return fn(args);
  }

  function unlock() {
    locked = false;
    prompt.style.display = '';
    line.textContent = '';
    buffer = '';
    screen.scrollTop = screen.scrollHeight;
    input.focus();
  }

  function render() {
    line.textContent = buffer;
  }

  input.addEventListener('keydown', function(e) {
    if (locked) { e.preventDefault(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      var cmd = buffer;
      println('<span class="term-ps1">danny@practicas:~$ </span>' + escape(cmd));
      if (cmd.trim()) { history.push(cmd); histIdx = history.length; }
      buffer = '';
      render();
      var async = runCommand(cmd);
      if (!async) unlock();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      buffer = buffer.slice(0, -1);
      render();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (histIdx > 0) { histIdx--; buffer = history[histIdx] || ''; render(); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx < history.length - 1) { histIdx++; buffer = history[histIdx]; }
      else { histIdx = history.length; buffer = ''; }
      render();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      buffer += e.key;
      render();
    }
  });

  // Arrancar
  typewriter(bootSeq, 180, unlock);
  setTimeout(function() { input.focus(); }, 100);
})();
</script>
