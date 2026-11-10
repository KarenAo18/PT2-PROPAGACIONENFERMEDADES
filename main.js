import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


// =====================================================
// VARIABLES
// =====================================================

let personas = [];

let numeroAsistentes = 100;
let infectadosIniciales = 1;
let porcentajeMascarillas = 50;
let radioContagio = 0.40;
let probabilidadTransmision = 20;
let velocidadMovimiento = 0.02;


let lugarSeleccionado = null;
// Tiempo de recuperación de la enfermedad
let tiempoRecuperacion = 60; // segundos simulados
let duracionSimulacion = 0;  // tiempo transcurrido
let ultimoTiempo = 0;        // control del reloj
let picoInfectados = 0;
let simulacionPausada = false;
let simulacionIniciada = false;

// =====================================================
// HISTORIAL PARA LA GRÁFICA EPIDEMIOLÓGICA 
// =====================================================

let historialGrafica = [];
let ultimoRegistroGrafica = -1;

const intervaloGrafica = 1; // Registrar cada segundo
const maximoPuntosGrafica = 60;


// =====================================================
// THREE.JS
// =====================================================

const container = document.getElementById("three-container");

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x202020);


// CÁMARA

const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
);

camera.position.set(0, 43, 39);


// RENDERER


const renderer = new THREE.WebGLRenderer({ antialias: true });

// Mejora la nitidez sin exigir demasiado a la computadora
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// Permite mover la cámara con el ratón
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.update();
controls.target.set(0, 1.5, 0);

// Ajustar la escena cuando cambia el tamaño de la ventana
window.addEventListener("resize", () => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
});



// =====================================================
// LUCES
// =====================================================

const luz = new THREE.DirectionalLight(
    0xffffff,
    2
);

luz.position.set(10, 20, 10);

scene.add(luz);


const luzAmbiente = new THREE.AmbientLight(
    0xffffff,
    1
);

scene.add(luzAmbiente);


// =====================================================
 // RECINTOS 3D: TRES DISEÑOS CON LOS MISMOS PARÁMETROS
// =====================================================

const grupoRecinto = new THREE.Group();
scene.add(grupoRecinto);

// Grupo independiente para la arquitectura exterior del estadio real.
// Se mantiene separado para que los escenarios A, B y C sigan funcionando.
const grupoArquitecturaEstadio = new THREE.Group();
scene.add(grupoArquitecturaEstadio);
let estadioRealActual = null;

let escenarioActual = "A";
let obstaculosColision = [];

const materialPiso = new THREE.MeshStandardMaterial({
    color: 0x263448, roughness: 0.88, metalness: 0.12
});
const materialPisoBorde = new THREE.MeshStandardMaterial({
    color: 0x52657e, roughness: 0.65, metalness: 0.25
});
const materialBarrera = new THREE.MeshStandardMaterial({
    color: 0xaebdce, metalness: 0.72, roughness: 0.3
});
const materialEscenario = new THREE.MeshStandardMaterial({
    color: 0x20283a, metalness: 0.55, roughness: 0.35
});
const materialLED = new THREE.MeshStandardMaterial({
    color: 0x00d9ff, emissive: 0x0077ff, emissiveIntensity: 1.8
});
const materialPantalla = new THREE.MeshStandardMaterial({
    color: 0x4b1b82, emissive: 0x4b1b82, emissiveIntensity: 1.25
});

function agregarAlRecinto(objeto) {
    grupoRecinto.add(objeto);
    return objeto;
}

function crearPisoRectangular(ancho, fondo) {
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(ancho + 0.7, 0.28, fondo + 0.7),
        materialPisoBorde
    );
    base.position.y = -0.18;
    agregarAlRecinto(base);

    const piso = new THREE.Mesh(
        new THREE.PlaneGeometry(ancho, fondo),
        materialPiso
    );
    piso.rotation.x = -Math.PI / 2;
    piso.position.y = -0.025;
    agregarAlRecinto(piso);

    const rejilla = new THREE.GridHelper(
        Math.max(ancho, fondo), Math.round(Math.max(ancho, fondo)),
        0x52657e, 0x34445c
    );
    rejilla.position.y = 0.012;
    rejilla.scale.set(ancho / Math.max(ancho, fondo), 1, fondo / Math.max(ancho, fondo));
    agregarAlRecinto(rejilla);
}

function crearPisoCircular(radio) {
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(radio + 0.35, radio + 0.35, 0.35, 96),
        materialPisoBorde
    );
    base.position.y = -0.19;
    agregarAlRecinto(base);

    const piso = new THREE.Mesh(
        new THREE.CircleGeometry(radio, 96),
        materialPiso
    );
    piso.rotation.x = -Math.PI / 2;
    piso.position.y = 0.005;
    agregarAlRecinto(piso);

    const aro = new THREE.Mesh(
        new THREE.TorusGeometry(radio, 0.12, 8, 96),
        materialLED
    );
    aro.rotation.x = Math.PI / 2;
    aro.position.y = 0.1;
    agregarAlRecinto(aro);

    const rejilla = new THREE.GridHelper(24, 24, 0x52657e, 0x34445c);
    rejilla.position.y = 0.015;
    agregarAlRecinto(rejilla);
}

function crearPisoIrregular() {
    const forma = new THREE.Shape();
    forma.moveTo(-12, -8);
    forma.lineTo(8, -8);
    forma.lineTo(12, -3);
    forma.lineTo(10, 7);
    forma.lineTo(3, 9);
    forma.lineTo(-8, 8);
    forma.lineTo(-12, 3);
    forma.closePath();

    const piso = new THREE.Mesh(
        new THREE.ShapeGeometry(forma, 2),
        materialPiso
    );
    piso.rotation.x = -Math.PI / 2;
    piso.position.y = 0;
    agregarAlRecinto(piso);

    const borde = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-12, 0.07, -8),
            new THREE.Vector3(8, 0.07, -8),
            new THREE.Vector3(12, 0.07, -3),
            new THREE.Vector3(10, 0.07, 7),
            new THREE.Vector3(3, 0.07, 9),
            new THREE.Vector3(-8, 0.07, 8),
            new THREE.Vector3(-12, 0.07, 3)
        ]),
        new THREE.LineBasicMaterial({ color: 0x00d9ff })
    );
    agregarAlRecinto(borde);

    const rejilla = new THREE.GridHelper(24, 24, 0x52657e, 0x34445c);
    rejilla.position.y = 0.018;
    agregarAlRecinto(rejilla);
}

function crearLineaRecinto(x1, z1, x2, z2, color = 0x8fa3bd) {
    const linea = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x1, 0.045, z1),
            new THREE.Vector3(x2, 0.045, z2)
        ]),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 })
    );
    agregarAlRecinto(linea);
}

// Registra una zona rectangular que las personas no pueden atravesar.
function registrarObstaculo(x, z, ancho, profundidad, margen = 0.28) {
    obstaculosColision.push({
        minX: x - ancho / 2 - margen,
        maxX: x + ancho / 2 + margen,
        minZ: z - profundidad / 2 - margen,
        maxZ: z + profundidad / 2 + margen
    });
}

function crearBarrera(x, z, ancho, orientacion = "horizontal", colision = true) {
    const profundidad = 0.16;
    const largoX = orientacion === "horizontal" ? ancho : profundidad;
    const largoZ = orientacion === "horizontal" ? profundidad : ancho;

    const barra = new THREE.Mesh(
        new THREE.BoxGeometry(largoX, 0.95, largoZ),
        materialBarrera
    );
    barra.position.set(x, 0.48, z);
    agregarAlRecinto(barra);

    const tapa = new THREE.Mesh(
        new THREE.BoxGeometry(largoX + 0.08, 0.08, largoZ + 0.08),
        materialLED
    );
    tapa.position.set(x, 0.96, z);
    agregarAlRecinto(tapa);

    // Las barras con luces LED también son obstáculos físicos.
    if (colision) registrarObstaculo(x, z, largoX, largoZ, 0.32);
}

function crearEscenarioMusical(x, z, ancho = 10, orientacion = "horizontal") {
    const plataforma = new THREE.Mesh(
        new THREE.BoxGeometry(ancho, 1, 2.8),
        materialEscenario
    );
    plataforma.position.set(x, 0.5, z);
    agregarAlRecinto(plataforma);
    // Evita que los asistentes atraviesen el escenario y la zona de la pantalla.
    registrarObstaculo(x, z, ancho, 2.8, 0.4);

    const frente = new THREE.Mesh(
        new THREE.BoxGeometry(ancho, 0.13, 0.12),
        materialLED
    );
    frente.position.set(x, 1.03, z + 1.42);
    agregarAlRecinto(frente);

    const pantalla = new THREE.Mesh(
        new THREE.BoxGeometry(ancho * 0.62, 2.6, 0.18),
        materialPantalla
    );
    pantalla.position.set(x, 2.55, z - 0.8);
    agregarAlRecinto(pantalla);

    const marco = new THREE.Mesh(
        new THREE.BoxGeometry(ancho + 1.4, 0.18, 0.25),
        materialBarrera
    );
    marco.position.set(x, 4.2, z - 0.8);
    agregarAlRecinto(marco);

    for (const lado of [-1, 1]) {
        const soporte = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 3.4, 0.18),
            materialBarrera
        );
        soporte.position.set(x + lado * (ancho / 2 + 0.55), 2.5, z - 0.8);
        agregarAlRecinto(soporte);

        const torre = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 2.2, 0.65),
            new THREE.MeshStandardMaterial({ color: 0x101722, metalness: 0.45 })
        );
        torre.position.set(x + lado * (ancho / 2 + 1), 1.1, z + 0.2);
        agregarAlRecinto(torre);
    }

    // Luces decorativas elevadas
    for (let i = 0; i < 5; i++) {
        const foco = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 12, 10),
            new THREE.MeshStandardMaterial({
                color: i % 2 ? 0x9b5cff : 0x00d9ff,
                emissive: i % 2 ? 0x9b5cff : 0x00d9ff,
                emissiveIntensity: 1.7
            })
        );
        foco.position.set(x - ancho * 0.38 + i * ancho * 0.19, 4.1, z + 0.45);
        agregarAlRecinto(foco);
    }
}

function crearGradasLaterales() {
    const materialGrada = new THREE.MeshStandardMaterial({
        color: 0x35445c, roughness: 0.75, metalness: 0.2
    });
    const materialAsiento = new THREE.MeshStandardMaterial({ color: 0x167c91, roughness: 0.5 });

    for (const lado of [-1, 1]) {
        for (let nivel = 0; nivel < 3; nivel++) {
            const grada = new THREE.Mesh(
                new THREE.BoxGeometry(1.4, 0.35, 9.5),
                materialGrada
            );
            grada.position.set(lado * (10.8 + nivel * 0.65), 0.25 + nivel * 0.38, 1.2);
            agregarAlRecinto(grada);
            // Las gradas completas quedan fuera de la zona caminable.
            registrarObstaculo(grada.position.x, grada.position.z, 1.4, 9.5, 0.18);

            for (let i = 0; i < 7; i++) {
                const asiento = new THREE.Mesh(
                    new THREE.BoxGeometry(0.7, 0.22, 0.55),
                    materialAsiento
                );
                asiento.position.set(
                    lado * (10.8 + nivel * 0.65),
                    0.5 + nivel * 0.38,
                    -2.5 + i * 1.25
                );
                agregarAlRecinto(asiento);
                registrarObstaculo(asiento.position.x, asiento.position.z, 0.7, 0.55, 0.22);
            }
        }
    }
}

function puntoDentroPoligono(x, z, vertices) {
    let dentro = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i][0], zi = vertices[i][1];
        const xj = vertices[j][0], zj = vertices[j][1];
        const cruza = ((zi > z) !== (zj > z)) &&
            (x < (xj - xi) * (z - zi) / ((zj - zi) || 0.00001) + xi);
        if (cruza) dentro = !dentro;
    }
    return dentro;
}

function estaDentroRecinto(x, z, margen = 0) {
    if (escenarioActual === "A") {
        return Math.hypot(x, z) <= 12.2 - margen;
    }
    if (escenarioActual === "B") {
        return Math.abs(x) <= 12.7 - margen && Math.abs(z) <= 9.2 - margen;
    }
    const vertices = [
        [-11.5, -7.5], [7.5, -7.5], [11.3, -2.8],
        [9.5, 6.5], [2.7, 8.5], [-7.5, 7.5], [-11.5, 2.7]
    ];
    return puntoDentroPoligono(x, z, vertices);
}

function posicionAleatoriaRecinto() {
    for (let intento = 0; intento < 300; intento++) {
        const x = (Math.random() - 0.5) * 24;
        const z = (Math.random() - 0.5) * 17;
        if (estaDentroRecinto(x, z, 0.5) &&
            !obstaculosColision.some(o =>
                x >= o.minX && x <= o.maxX && z >= o.minZ && z <= o.maxZ
            )) {
            return { x, z };
        }
    }
    return { x: 0, z: 3 };
}

// =====================================================
// ARQUITECTURAS 3D APROXIMADAS DE ESTADIOS REALES
// =====================================================

// Materiales de cristal: las paredes y gradas dejan ver claramente el interior.
const materialExterior = new THREE.MeshStandardMaterial({
    color: 0x39b9d8, roughness: 0.18, metalness: 0.08,
    transparent: true, opacity: 0.16, depthWrite: false,
    side: THREE.DoubleSide
});
const materialGradasExterior = new THREE.MeshStandardMaterial({
    color: 0x4d8fc4, roughness: 0.28, metalness: 0.04,
    transparent: true, opacity: 0.13, depthWrite: false,
    side: THREE.DoubleSide
});
// Techo celeste muy suave; paredes en turquesa para distinguir ambos cristales.
const materialTechoEstadio = new THREE.MeshStandardMaterial({
    color: 0xb8eaff, roughness: 0.12, metalness: 0.05,
    transparent: true, opacity: 0.07, depthWrite: false,
    side: THREE.DoubleSide
});
const materialVidrioEstadio = new THREE.MeshStandardMaterial({
    color: 0x20c9c3, roughness: 0.12, metalness: 0.04,
    transparent: true, opacity: 0.10, depthWrite: false,
    side: THREE.DoubleSide
});

function agregarParedesDeVidrio(grupo, radioX, radioZ, altura = 5.2) {
    const paredes = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, altura, 96, 1, true),
        materialVidrioEstadio
    );
    paredes.scale.set(radioX, 1, radioZ);
    paredes.position.y = altura / 2;
    grupo.add(paredes);
}

function agregarAnilloOvalado(grupo, radioX, radioZ, grosor, altura, material) {
    const anillo = new THREE.Mesh(
        new THREE.TorusGeometry(1, grosor, 8, 96), material
    );
    anillo.scale.set(radioX, radioZ, 1);
    anillo.rotation.x = Math.PI / 2;
    anillo.position.y = altura;
    grupo.add(anillo);
    return anillo;
}

function crearGradasOvaladas(grupo, radioX, radioZ, niveles, material = materialGradasExterior) {
    for (let nivel = 0; nivel < niveles; nivel++) {
        const grada = new THREE.Mesh(
            new THREE.TorusGeometry(1, 0.72, 5, 96), material
        );
        grada.scale.set(radioX + nivel * 0.72, radioZ + nivel * 0.58, 1);
        grada.rotation.x = Math.PI / 2;
        grada.position.y = 0.65 + nivel * 0.72;
        grupo.add(grada);
    }
}

function crearArquitecturaEstadio(tipo) {
    grupoArquitecturaEstadio.clear();
    estadioRealActual = tipo || null;
    if (!tipo) return;

    const grupo = grupoArquitecturaEstadio;
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(16.8, 17.8, 0.18, 96),
        new THREE.MeshStandardMaterial({ color: 0x54b9c8, roughness: 0.3, transparent: true, opacity: 0.10, depthWrite: false })
    );
    base.position.y = -0.25;
    grupo.add(base);

    if (tipo === "azteca") {
        agregarParedesDeVidrio(grupo, 16.4, 12.2, 5.4);
        // Estadio Azteca: gran bowl abierto, ovalado y con varios niveles.
        crearGradasOvaladas(grupo, 12.7, 9.2, 5);
        agregarAnilloOvalado(grupo, 16.2, 12.0, 0.42, 4.3, materialExterior);
        agregarAnilloOvalado(grupo, 15.1, 11.0, 0.18, 5.0, materialTechoEstadio);
        // Estructuras exteriores verticales.
        for (let i = 0; i < 20; i++) {
            const a = i * Math.PI * 2 / 20;
            const pilar = new THREE.Mesh(
                new THREE.BoxGeometry(0.38, 4.2, 0.38), materialExterior
            );
            pilar.position.set(Math.cos(a) * 16.1, 2.0, Math.sin(a) * 11.9);
            grupo.add(pilar);
        }
    } else if (tipo === "palacio") {
        agregarParedesDeVidrio(grupo, 15.2, 15.2, 5.4);
        // Palacio de los Deportes: volumen circular cerrado y cubierta abovedada.
        // Vista tipo maqueta abierta: se omiten muro y cúpula para no tapar
        // a las personas ni la simulación desde la cámara exterior.
        crearGradasOvaladas(grupo, 11.8, 11.8, 3);
        agregarAnilloOvalado(grupo, 15.0, 15.0, 0.28, 5.0, materialTechoEstadio);
    } else if (tipo === "olimpico") {
        agregarParedesDeVidrio(grupo, 16.3, 12.7, 4.0);
        // Olímpico Universitario: bowl ovalado bajo, abierto y escalonado.
        crearGradasOvaladas(grupo, 13.0, 9.8, 4);
        agregarAnilloOvalado(grupo, 16.0, 12.5, 0.55, 3.0, materialExterior);
        agregarAnilloOvalado(grupo, 14.8, 11.2, 0.22, 3.8, materialTechoEstadio);
        // Talud exterior bajo.
        const talud = new THREE.Mesh(
            new THREE.CylinderGeometry(16.2, 17.0, 1.8, 64, 1, true),
            materialGradasExterior
        );
        talud.position.y = 0.5;
        grupo.add(talud);
    } else if (tipo === "akron") {
        agregarParedesDeVidrio(grupo, 16.2, 12.2, 5.3);
        // Akron: bowl ovalado con cubierta perimetral elevada.
        crearGradasOvaladas(grupo, 12.5, 9.5, 4);
        agregarAnilloOvalado(grupo, 16.0, 12.0, 0.7, 5.2, materialTechoEstadio);
        agregarAnilloOvalado(grupo, 14.2, 10.5, 0.25, 4.5, materialExterior);
        for (let i = 0; i < 16; i++) {
            const a = i * Math.PI * 2 / 16;
            const soporte = new THREE.Mesh(
                new THREE.CylinderGeometry(0.16, 0.28, 5.0, 8), materialExterior
            );
            soporte.position.set(Math.cos(a) * 15.0, 2.5, Math.sin(a) * 11.2);
            grupo.add(soporte);
        }
    } else if (tipo === "bbva") {
        agregarParedesDeVidrio(grupo, 16.4, 12.2, 5.0);
        // BBVA: bowl moderno con anillos inclinados y cubierta parcial.
        crearGradasOvaladas(grupo, 12.4, 9.4, 5);
        agregarAnilloOvalado(grupo, 16.2, 12.0, 0.55, 4.0, materialExterior);
        const cubierta = new THREE.Mesh(
            new THREE.CylinderGeometry(16.4, 14.5, 0.5, 64, 1, true, 0.15, Math.PI * 1.55),
            materialTechoEstadio
        );
        cubierta.position.y = 6.0;
        grupo.add(cubierta);
        for (let i = 0; i < 12; i++) {
            const a = i * Math.PI * 2 / 12;
            const soporte = new THREE.Mesh(
                new THREE.BoxGeometry(0.28, 5.5, 0.28), materialExterior
            );
            soporte.position.set(Math.cos(a) * 15.2, 2.7, Math.sin(a) * 11.3);
            grupo.add(soporte);
        }
    }
}

function construirRecinto(tipo) {
    escenarioActual = tipo;
    obstaculosColision = [];

    // PALETA DE COLORES SEGÚN EL ESTADIO
if (tipo === "A") {
    // ESTADIO A: CONCIERTO ROJO
    materialPiso.color.set(0x42151b);
    materialPisoBorde.color.set(0x8b2635);
    materialBarrera.color.set(0xffb3b3);
    materialEscenario.color.set(0x351015);
    materialLED.color.set(0xff2020);
    materialLED.emissive.set(0xff0000);
    materialPantalla.color.set(0x9e1010);
    materialPantalla.emissive.set(0x600000);

} else if (tipo === "B") {
    // ESTADIO B: CONCIERTO NARANJA
    materialPiso.color.set(0x482817);
    materialPisoBorde.color.set(0xc45c20);
    materialBarrera.color.set(0xffd0a3);
    materialEscenario.color.set(0x382012);
    materialLED.color.set(0xff8500);
    materialLED.emissive.set(0xff5a00);
    materialPantalla.color.set(0xc94b0c);
    materialPantalla.emissive.set(0x7a2600);

} else {
    // ESTADIO C: CONCIERTO MORADO Y MAGENTA
    materialPiso.color.set(0x28143f);
    materialPisoBorde.color.set(0x7038a0);
    materialBarrera.color.set(0xf0b6ff);
    materialEscenario.color.set(0x20102e);
    materialLED.color.set(0xff35d3);
    materialLED.emissive.set(0xc900a8);
    materialPantalla.color.set(0x8125b5);
    materialPantalla.emissive.set(0x510078);
}

materialLED.emissiveIntensity = 1.8;
materialPantalla.emissiveIntensity = 1.5;
    grupoRecinto.clear();

    if (tipo === "A") {
        // A: recinto circular con escenario al fondo y anillos de circulación
        crearPisoCircular(12.2);
        crearEscenarioMusical(0, -8.2, 8.5);
        crearGradasLaterales();

        // Barreras curvas aproximadas por segmentos
        for (const radio of [5.2, 8.2]) {
            for (let a = 205; a <= 335; a += 26) {
                const rad = a * Math.PI / 180;
                const x = Math.cos(rad) * radio;
                const z = Math.sin(rad) * radio + 0.4;
                crearBarrera(x, z, 2.8, "horizontal", true);
            }
        }
        crearBarrera(-3.4, -3.2, 2.8, "vertical");
        crearBarrera(3.4, -3.2, 2.8, "vertical");
        crearLineaRecinto(-7, 0, 7, 0, 0x9b5cff);
        crearLineaRecinto(-6, 4, 6, 4, 0x00d9ff);

    } else if (tipo === "B") {
        // B: recinto rectangular con pasillos y barreras transversales
        crearPisoRectangular(25.4, 18.4);
        crearEscenarioMusical(0, -7.2, 11);
        crearGradasLaterales();

        crearBarrera(-7.5, -3.2, 3.8, "horizontal");
        crearBarrera(-2.5, -3.2, 3.8, "horizontal");
        crearBarrera(2.5, -3.2, 3.8, "horizontal");
        crearBarrera(7.5, -3.2, 3.8, "horizontal");
        crearBarrera(-5.8, 2.2, 4.5, "vertical");
        crearBarrera(5.8, 2.2, 4.5, "vertical");
        crearLineaRecinto(-12, 5.8, 12, 5.8, 0x9b5cff);
        crearLineaRecinto(-12, 0.1, -8.2, 0.1, 0x00d9ff);
        crearLineaRecinto(8.2, 0.1, 12, 0.1, 0x00d9ff);

    } else {
        // C: recinto irregular con zonas separadas y rutas alternativas
        crearPisoIrregular();
        crearEscenarioMusical(0, -6.8, 8.5);
        crearBarrera(-5.2, -2.4, 4.2, "vertical");
        crearBarrera(4.7, -2.4, 3.6, "vertical");
        crearBarrera(-1.0, 1.1, 5.5, "horizontal");
        crearBarrera(6.1, 3.8, 3.0, "horizontal");
        crearBarrera(-6.8, 4.5, 3.0, "horizontal");
        crearLineaRecinto(-7.5, -5.5, -7.5, 5.5, 0x9b5cff);
        crearLineaRecinto(2.5, -5.8, 2.5, 6.5, 0x00d9ff);
        crearLineaRecinto(-7.5, 6.2, 7.5, 6.2, 0xffb454);
    }

    // Luces de ambiente y pequeños marcadores de entrada
    for (const lado of [-1, 1]) {
        const luzEntrada = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 0.18, 0.35),
            new THREE.MeshStandardMaterial({
                color: 0x38d9a0, emissive: 0x16865e, emissiveIntensity: 1.2
            })
        );
        luzEntrada.position.set(lado * 2, 0.12, 8.4);
        agregarAlRecinto(luzEntrada);
    }

    controls.target.set(0, 0.8, 0);
    controls.update();
}

construirRecinto("A");


// =====================================================
// PERSONAS
// =====================================================


function crearPersona(estado) {

    // Crear un grupo que representa a una persona
    const persona = new THREE.Group();

    // Colores según el estado epidemiológico
    let color;

    if (estado === "infectado") {
        color = 0xff3333; // Rojo
    } else if (estado === "recuperado") {
        color = 0x2196f3; // Azul
    } else {
        color = 0x00cc66; // Verde
    }

    const materialCuerpo = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.85
    });

    const materialPiel = new THREE.MeshStandardMaterial({
        color: 0xe0ad86
    });

    const materialRopa = materialCuerpo;

    const materialZapatos = new THREE.MeshStandardMaterial({
        color: 0x292929
    });


    // Función auxiliar para crear partes del cuerpo
    function agregarParte(geometria, material, x, y, z) {
        const parte = new THREE.Mesh(geometria, material);
        parte.position.set(x, y, z);
        persona.add(parte);
        return parte;
    }

    // CUERPO
    agregarParte(
        new THREE.CylinderGeometry(0.20, 0.27, 0.65, 8),
        materialRopa,
        0, 0.95, 0
    );

    // CABEZA
    agregarParte(
        new THREE.SphereGeometry(0.19, 12, 10),
        materialPiel,
        0, 1.48, 0
    );

    // CABELLO
    const cabello = new THREE.MeshStandardMaterial({
        color: 0x38251b
    });

    agregarParte(
        new THREE.SphereGeometry(
            0.195, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2
        ),
        cabello,
        0, 1.53, 0
    );

    // BRAZOS
    const brazoGeometry = new THREE.CylinderGeometry(
        0.065, 0.08, 0.55, 8
    );

    const brazoIzquierdo = agregarParte(
        brazoGeometry, materialRopa, -0.29, 0.98, 0
    );
    brazoIzquierdo.rotation.z = -0.12;

    const brazoDerecho = agregarParte(
        brazoGeometry, materialRopa, 0.29, 0.98, 0
    );
    brazoDerecho.rotation.z = 0.12;

    // PIERNAS
    const piernaGeometry = new THREE.CylinderGeometry(
        0.085, 0.075, 0.55, 8
    );

    agregarParte(
        piernaGeometry, materialRopa, -0.12, 0.31, 0
    );

    agregarParte(
        piernaGeometry, materialRopa, 0.12, 0.31, 0
    );

    // ZAPATOS
    agregarParte(
        new THREE.BoxGeometry(0.16, 0.10, 0.27),
        materialZapatos, -0.12, 0.07, 0.04
    );

    agregarParte(
        new THREE.BoxGeometry(0.16, 0.10, 0.27),
        materialZapatos, 0.12, 0.07, 0.04
    );

    // DATOS DE LA PERSONA
    const mascarilla =
        Math.random() * 100 < porcentajeMascarillas;

    // CUBREBOCAS: delante de la cara
    if (mascarilla) {
        const materialMascarilla =
            new THREE.MeshStandardMaterial({
                color: 0xf2f2f2,
                roughness: 0.9
            });

        agregarParte(
            new THREE.BoxGeometry(0.25, 0.12, 0.045),
            materialMascarilla,
            0, 1.42, 0.17
        );
    }

    // Posición aleatoria dentro de la forma del recinto elegido
    const posicionInicial = posicionAleatoriaRecinto();
    persona.position.set(posicionInicial.x, 0, posicionInicial.z);

    // Orientar a los asistentes en distintas direcciones
    persona.rotation.y = Math.random() * Math.PI * 2;

    // INFORMACIÓN PARA LA SIMULACIÓN
    
    persona.userData = {
        estado: estado,

        velocidadX:
            (Math.random() - 0.5) * velocidadMovimiento,

        velocidadZ:
            (Math.random() - 0.5) * velocidadMovimiento,

        mascarilla: mascarilla,

        materialEstado: materialCuerpo,

        tiempoInfeccion:
            estado === "infectado" ? 0 : null
    }; 

        scene.add(persona);
        personas.push(persona);
    }



// =====================================================
// CREAR POBLACIÓN
// =====================================================

function crearPoblacion() {

    // eliminar población anterior

    personas.forEach(persona => {

        scene.remove(persona);

    });

    personas = [];


    for (
        let i = 0;
        i < numeroAsistentes;
        i++
    ) {

        let estado = "susceptible";

        if (
            i < infectadosIniciales
        ) {

            estado = "infectado";

        }

        crearPersona(estado);
    }


    actualizarEstadisticas();
}


// =====================================================
// MOVIMIENTO
// =====================================================

function moverPersonas() {
    personas.forEach(persona => {
        const anteriorX = persona.position.x;
        const anteriorZ = persona.position.z;

        persona.position.x += persona.userData.velocidadX;
        persona.position.z += persona.userData.velocidadZ;

        // Rebotar en los límites del recinto, sea circular, rectangular o irregular.
        // El margen contempla el ancho del cuerpo para que no sobresalga del piso.
        if (!estaDentroRecinto(persona.position.x, persona.position.z, 0.65)) {
            persona.position.x = anteriorX;
            persona.position.z = anteriorZ;
            persona.userData.velocidadX *= -1;
            persona.userData.velocidadZ *= -1;
        }

        // Las barreras también bloquean el paso de los asistentes.
        const chocaConBarrera = obstaculosColision.some(o =>
            persona.position.x >= o.minX &&
            persona.position.x <= o.maxX &&
            persona.position.z >= o.minZ &&
            persona.position.z <= o.maxZ
        );

        if (chocaConBarrera) {
            // Primero se prueba el movimiento en cada eje por separado.
            // Así no atraviesan la barrera y pueden deslizarse por sus laterales.
            const xPropuesto = persona.position.x;
            const zPropuesto = persona.position.z;
            const chocaEnX = obstaculosColision.some(o =>
                xPropuesto >= o.minX && xPropuesto <= o.maxX &&
                anteriorZ >= o.minZ && anteriorZ <= o.maxZ
            );
            const chocaEnZ = obstaculosColision.some(o =>
                anteriorX >= o.minX && anteriorX <= o.maxX &&
                zPropuesto >= o.minZ && zPropuesto <= o.maxZ
            );

            persona.position.x = chocaEnX ? anteriorX : xPropuesto;
            persona.position.z = chocaEnZ ? anteriorZ : zPropuesto;
            if (chocaEnX || (!chocaEnX && !chocaEnZ)) persona.userData.velocidadX *= -1;
            if (chocaEnZ || (!chocaEnX && !chocaEnZ)) persona.userData.velocidadZ *= -1;

            // Última protección: nunca dejar al agente dentro de un obstáculo.
            if (obstaculosColision.some(o =>
                persona.position.x >= o.minX && persona.position.x <= o.maxX &&
                persona.position.z >= o.minZ && persona.position.z <= o.maxZ
            )) {
                persona.position.x = anteriorX;
                persona.position.z = anteriorZ;
            }
        }
    });
}


// =====================================================
// CONTAGIO
// =====================================================


function revisarContagios() {

    const infectados =
        personas.filter(
            p => p.userData.estado === "infectado"
        );


    infectados.forEach(infectado => {

        personas.forEach(persona => {

            if (
                persona.userData.estado !==
                "susceptible"
            ) {

                return;

            }


            const distancia =
                infectado.position.distanceTo(
                    persona.position
                );


            if (
                distancia <= radioContagio
            ) {

                const contagio =
                    Math.random() * 100 <
                    probabilidadTransmision;

                    //Reloj comienza desde el inicio de contagio de cada persona

                if (contagio) {

                    persona.userData.estado = "infectado";

                    persona.userData.tiempoInfeccion = duracionSimulacion;

                    persona.userData.materialEstado.color.set(0xff3333);

                }

            }

        });

    });

}



/* =====================================================
   RECUPERACIÓN DE LOS INFECTADOS
===================================================== */

function revisarRecuperaciones() {

    personas.forEach(persona => {

        if (persona.userData.estado !== "infectado") {
            return;
        }

        const tiempoInfectado =
            duracionSimulacion -
            persona.userData.tiempoInfeccion;

        if (tiempoInfectado >= tiempoRecuperacion) {

            // Cambiar el estado epidemiológico
            persona.userData.estado = "recuperado";

            // Cambiar el color del cuerpo a azul
            persona.userData.materialEstado.color.set(0x2196f3);

            // Evitar que vuelva a infectarse
            persona.userData.tiempoInfeccion = null;
        }

    });

}


// =====================================================
// ESTADÍSTICAS
// =====================================================

function actualizarEstadisticas() {

    let susceptibles = 0;
    let infectados = 0;
    let recuperados = 0;


    personas.forEach(persona => {

        if (
            persona.userData.estado ===
            "susceptible"
        ) {

            susceptibles++;

        }

        if (
            persona.userData.estado ===
            "infectado"
        ) {

            infectados++;

        }

        if (
            persona.userData.estado ===
            "recuperado"
        ) {

            recuperados++;

        }

    });


    document.getElementById(
        "susceptibles"
    ).textContent = susceptibles;


    document.getElementById(
        "infectados"
    ).textContent = infectados;


    document.getElementById(
        "recuperados"
    ).textContent = recuperados;


    registrarPuntoGrafica(
    susceptibles,
    infectados,
    recuperados
);


    // Actualizar el pico máximo de infectados
    picoInfectados = Math.max(
        picoInfectados,
        infectados
    );

    // Calcular porcentajes
    const total = personas.length;

    const porcentajeI = total > 0
        ? (infectados / total) * 100
        : 0;

    const porcentajeR = total > 0
        ? (recuperados / total) * 100
        : 0;

    // Mostrar los indicadores en pantalla
    document.getElementById("porcentajeInfectados")
        .textContent = porcentajeI.toFixed(1) + "%";

    document.getElementById("picoInfectados")
        .textContent = picoInfectados;

    document.getElementById("tiempoTranscurrido")
        .textContent = duracionSimulacion.toFixed(1) + " s";

    document.getElementById("porcentajeRecuperados")
        .textContent = porcentajeR.toFixed(1) + "%";


}



/* ==========================================
   GRÁFICA EPIDEMIOLÓGICA
========================================== */

function registrarPuntoGrafica(s, i, r) {
    // No registrar datos si no hay asistentes
    if (personas.length === 0) {
        dibujarGrafica();
        return;
    }

    // Guardar el primer dato inmediatamente
    if (
        historialGrafica.length === 0 ||
        duracionSimulacion - ultimoRegistroGrafica >= intervaloGrafica
    ) {
        historialGrafica.push({
            tiempo: duracionSimulacion,
            susceptibles: s,
            infectados: i,
            recuperados: r
        });

        ultimoRegistroGrafica = duracionSimulacion;

        // Conservar solo los últimos 60 registros
        if (historialGrafica.length > maximoPuntosGrafica) {
            historialGrafica.shift();
        }

        dibujarGrafica();
    }
}

function dibujarGrafica() {
    const canvas = document.getElementById(
        "graficaEpidemiologica"
    );

    if (!canvas) return;

    const contexto = canvas.getContext("2d");
    const ancho = canvas.clientWidth;
    const alto = canvas.clientHeight;

    if (!ancho || !alto) return;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(ancho * dpr);
    canvas.height = Math.round(alto * dpr);

    contexto.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Fondo
    contexto.clearRect(0, 0, ancho, alto);
    contexto.fillStyle = "#171d2b";
    contexto.fillRect(0, 0, ancho, alto);

    const margenIzquierdo = 42;
    const margenDerecho = 12;
    const margenSuperior = 12;
    const margenInferior = 30;

    const graficaAncho =
        ancho - margenIzquierdo - margenDerecho;

    const graficaAlto =
        alto - margenSuperior - margenInferior;

    const datos = historialGrafica;

    // Escala vertical: número total de asistentes
    const maximo = Math.max(
        1,
        ...datos.map(d =>
            d.susceptibles + d.infectados + d.recuperados
        )
    );

    // Líneas horizontales y etiquetas
    contexto.font = "11px Arial";
    contexto.textAlign = "right";
    contexto.textBaseline = "middle";

    for (let nivel = 0; nivel <= 4; nivel++) {
        const y = margenSuperior +
            graficaAlto * nivel / 4;

        const valor = Math.round(maximo * (4 - nivel) / 4);

        contexto.strokeStyle = "#344157";
        contexto.lineWidth = 1;
        contexto.beginPath();
        contexto.moveTo(margenIzquierdo, y);
        contexto.lineTo(ancho - margenDerecho, y);
        contexto.stroke();

        contexto.fillStyle = "#cbd5e1";
        contexto.fillText(valor, margenIzquierdo - 7, y);
    }

    // Etiqueta del eje vertical
    contexto.save();
    contexto.translate(12, alto / 2);
    contexto.rotate(-Math.PI / 2);
    contexto.fillStyle = "#cbd5e1";
    contexto.textAlign = "center";
    contexto.fillText("Personas", 0, 0);
    contexto.restore();

    // Eje horizontal: tiempo
    contexto.fillStyle = "#cbd5e1";
    contexto.textAlign = "center";
    contexto.textBaseline = "alphabetic";
    contexto.fillText(
        "Tiempo de simulación (s)",
        margenIzquierdo + graficaAncho / 2,
        alto - 5
    );

    if (datos.length === 0) return;

    const series = [
        { clave: "susceptibles", color: "#00cc66" },
        { clave: "infectados", color: "#ff4545" },
        { clave: "recuperados", color: "#2196f3" }
    ];

    // Dibujar las tres curvas
    series.forEach(serie => {
        contexto.strokeStyle = serie.color;
        contexto.fillStyle = serie.color;
        contexto.lineWidth = 2.5;
        contexto.lineJoin = "round";
        contexto.lineCap = "round";

        contexto.beginPath();

        datos.forEach((dato, indice) => {
            const x = margenIzquierdo +
                (datos.length === 1
                    ? graficaAncho / 2
                    : indice * graficaAncho / (datos.length - 1));

            const y = margenSuperior +
                graficaAlto *
                (1 - dato[serie.clave] / maximo);

            if (indice === 0) {
                contexto.moveTo(x, y);
            } else {
                contexto.lineTo(x, y);
            }
        });

        contexto.stroke();

        // Punto visible cuando solo hay un dato
        if (datos.length === 1) {
            const y = margenSuperior +
                graficaAlto *
                (1 - datos[0][serie.clave] / maximo);

            contexto.beginPath();
            contexto.arc(
                margenIzquierdo + graficaAncho / 2,
                y,
                4,
                0,
                Math.PI * 2
            );
            contexto.fill();
        }
    });
}

// Ajustar la gráfica al cambiar el tamaño de la ventana
window.addEventListener("resize", dibujarGrafica);



// =====================================================
// OPENSTREETMAP Y SELECCIÓN DE ESTADIOS REALES
// =====================================================

let mapaOSM;
let marcadorOSM = null;

const estadiosMexico = {
    azteca: {
        nombre: "Estadio Azteca",
        direccion: "Santa Úrsula Coapa, Ciudad de México",
        lat: 19.3029,
        lng: -99.1505
    },
    olimpico: {
        nombre: "Estadio Olímpico Universitario",
        direccion: "Ciudad Universitaria, Ciudad de México",
        lat: 19.3322,
        lng: -99.1922
    },
    palacio: {
        nombre: "Palacio de los Deportes",
        direccion: "Granjas México, Ciudad de México",
        lat: 19.4042,
        lng: -99.0980
    },
    akron: {
        nombre: "Estadio Akron",
        direccion: "Zapopan, Jalisco",
        lat: 20.6827,
        lng: -103.4644
    },
    bbva: {
        nombre: "Estadio BBVA",
        direccion: "Guadalupe, Nuevo León",
        lat: 25.6692,
        lng: -100.2440
    }
};

function iniciarMapaOSM() {
    const contenedor = document.getElementById("mapaGoogle");

    mapaOSM = L.map(contenedor).setView(
        [19.4326, -99.1332],
        11
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }
    ).addTo(mapaOSM);
}

function seleccionarEstadioReal(estadio) {
    if (!estadio || !mapaOSM) return;

    lugarSeleccionado = estadio;

    document.getElementById("nombreLugar").textContent =
        estadio.nombre;

    document.getElementById("direccionLugar").textContent =
        estadio.direccion;

    document.getElementById("coordenadasLugar").textContent =
        `${estadio.lat.toFixed(6)}, ${estadio.lng.toFixed(6)}`;

    mapaOSM.setView(
        [estadio.lat, estadio.lng],
        16
    );

    if (marcadorOSM) {
        mapaOSM.removeLayer(marcadorOSM);
    }

    marcadorOSM = L.marker(
        [estadio.lat, estadio.lng]
    ).addTo(mapaOSM);

    marcadorOSM.bindPopup(estadio.nombre).openPopup();

    // Cambiar la simulación al modelo de estadio real.
    personas.forEach(persona => scene.remove(persona));
    personas = [];

    simulacionPausada = false;
    simulacionIniciada = false;

    document.getElementById("pausar").disabled = true;
    document.getElementById("pausar").textContent =
        "Pausar simulación";

    duracionSimulacion = 0;
    ultimoTiempo = performance.now();
    picoInfectados = 0;
    historialGrafica = [];
    ultimoRegistroGrafica = -1;

    // La arquitectura del estadio se dibuja en un grupo independiente.
    // El escenario A/B/C seleccionado sigue controlando el área del concierto.
    crearArquitecturaEstadio(document.getElementById("estadioReal").value);

    document.getElementById("descripcionEscenario").textContent =
        `${estadio.nombre}: arquitectura 3D aproximada. La distribución interior sigue el escenario ${escenarioActual}.`;

    actualizarEstadisticas();
    dibujarGrafica();
    renderer.render(scene, camera);
}

iniciarMapaOSM();

document.getElementById("estadioReal").addEventListener(
    "change",
    evento => {
        const estadio =
            estadiosMexico[evento.target.value];

        if (estadio) {
            seleccionarEstadioReal(estadio);
        }
    }
);



// =====================================================
// SELECTOR DE ESCENARIO FÍSICO A / B / C
// =====================================================

const selectorEscenario = document.getElementById("escenarioSimulacion");
const descripcionEscenario = document.getElementById("descripcionEscenario");

const descripcionesEscenarios = {
    A: "Recinto circular: distribución alrededor de la zona central y barreras curvas.",
    B: "Recinto rectangular: pasillos largos, barreras transversales y gradas laterales.",
    C: "Recinto irregular: varias zonas conectadas por rutas y obstáculos."
};

selectorEscenario.addEventListener("change", () => {
    // Cambiar el diseño no modifica los parámetros epidemiológicos.
    simulacionPausada = false;
    simulacionIniciada = false;

    const botonPausa = document.getElementById("pausar");
    botonPausa.disabled = true;
    botonPausa.textContent = "Pausar simulación";

    personas.forEach(persona => scene.remove(persona));
    personas = [];

    duracionSimulacion = 0;
    ultimoTiempo = performance.now();
    picoInfectados = 0;
    historialGrafica = [];
    ultimoRegistroGrafica = -1;

    construirRecinto(selectorEscenario.value);
    // No borrar la arquitectura exterior al cambiar entre A, B y C.
    descripcionEscenario.textContent = estadioRealActual
        ? `${lugarSeleccionado.nombre}: arquitectura 3D aproximada. ${descripcionesEscenarios[selectorEscenario.value]}`
        : descripcionesEscenarios[selectorEscenario.value];

    actualizarEstadisticas();
    dibujarGrafica();
    renderer.render(scene, camera);
});

// =====================================================
// LEER PARÁMETROS
// =====================================================

function leerParametros() {

    numeroAsistentes =
        parseInt(
            document.getElementById(
                "numeroAsistentes"
            ).value
        );


    infectadosIniciales =
        parseInt(
            document.getElementById(
                "infectadosIniciales"
            ).value
        );


    porcentajeMascarillas =
        parseInt(
            document.getElementById(
                "porcentajeMascarillas"
            ).value
        );


    radioContagio =
        parseFloat(
            document.getElementById(
                "radioContagio"
            ).value
        );


    probabilidadTransmision =
        parseFloat(
            document.getElementById(
                "probabilidad"
            ).value
        );


    velocidadMovimiento =
        parseFloat(
            document.getElementById(
                "velocidad"
            ).value
        );

}


// =====================================================
// BOTÓN INICIAR
// =====================================================

document.getElementById(
    "iniciar"
).addEventListener(
    "click",
    () => {

        leerParametros();

        simulacionPausada = false;
        simulacionIniciada = true;

        document.getElementById("pausar").disabled = false;
        document.getElementById("pausar").textContent =
            "Pausar simulación";

        duracionSimulacion = 0;
        ultimoTiempo = performance.now();
        picoInfectados = 0;

        historialGrafica = [];
        ultimoRegistroGrafica = -1;

        crearPoblacion();

    }
);


// =====================================================
//   BOTÓN PAUSAR Y CONTINUAR
// =====================================================

document.getElementById("pausar").addEventListener("click", () => {
    if (!simulacionIniciada) return;

    simulacionPausada = !simulacionPausada;

    const boton = document.getElementById("pausar");

    if (simulacionPausada) {
        boton.textContent = "Continuar simulación";
    } else {
        // Evitar que el tiempo avance durante la pausa
        ultimoTiempo = performance.now();
        boton.textContent = "Pausar simulación";
    }
});



// =====================================================
// BOTÓN REINICIAR
// =====================================================

document.getElementById(
    "reiniciar"
).addEventListener(
    "click",
    () => {

        simulacionPausada = false;
        simulacionIniciada = false;

        const botonPausa = document.getElementById("pausar");
        botonPausa.disabled = true;
        botonPausa.textContent = "Pausar simulación";

        personas.forEach(
            persona =>
                scene.remove(persona)
        );

        personas = [];

        duracionSimulacion = 0;
        ultimoTiempo = performance.now();
        picoInfectados = 0;

        historialGrafica = [];
        ultimoRegistroGrafica = -1;

        actualizarEstadisticas();
        dibujarGrafica();

    }
);


// =====================================================
// ANIMACIÓN
// =====================================================


function animar() {

    requestAnimationFrame(animar);

    if (simulacionPausada) {
    controls.update();
    renderer.render(scene, camera);
    return;
}

    // Calcular el tiempo transcurrido
    const ahora = performance.now();

    if (ultimoTiempo === 0) {
        ultimoTiempo = ahora;
    }

    const delta = Math.min((ahora - ultimoTiempo) / 1000, 0.1);

    ultimoTiempo = ahora;

    // Actualizar el tiempo de la simulación
    duracionSimulacion += delta;

    moverPersonas();

    revisarContagios();

    revisarRecuperaciones();

    actualizarEstadisticas();

    controls.update();

    renderer.render(scene, camera);
}

animar();
