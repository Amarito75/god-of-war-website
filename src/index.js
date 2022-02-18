import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import styles from './main.styl'
import gsap from 'gsap';
import GUI from 'lil-gui'
import { TextureLoader } from 'three';

//-----------------------------------------------------------
//DEBUG
//-----------------------------------------------------------

const debug = new GUI()
if (window.location.hash !== '#debug')
    debug.hide()



//-----------------------------------------------------------
//LOADERS
//-----------------------------------------------------------

const exrLoader=new EXRLoader()
const gltfLoader = new GLTFLoader()
const textureLoader = new TextureLoader()

//-----------------------------------------------------------
//SCENE
//-----------------------------------------------------------

const scene = new THREE.Scene()


//-----------------------------------------------------------
//SIZES
//-----------------------------------------------------------

const sizes = {}
sizes.width = window.innerWidth
sizes.height = window.innerHeight

//-----------------------------------------------------------
//RESIZE
//-----------------------------------------------------------

window.addEventListener('resize', () =>
{
    // Update sizes object
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    
    // Update orbit controls
    // cameraControls.update()
})

//-----------------------------------------------------------
//CAMERA
//-----------------------------------------------------------

// Group

const cameraGroup = new THREE.Group()
scene.add(cameraGroup)

// Base camera

const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 1000)
camera.position.z = 70
cameraGroup.add(camera)
window.camera = camera
 
//-----------------------------------------------------------
//BACKGROUND
//-----------------------------------------------------------

const bgColorTexture = textureLoader.load('pictures/background-gow.png')
bgColorTexture.encoding = THREE.sRGBEncoding
const bgGeometry = new THREE.CylinderGeometry( 300, 300, 500, 32, 1, true, 0, Math.PI );
const bgMaterial = new THREE.MeshBasicMaterial( {
    map: bgColorTexture,
    toneMapped: false,
    side: THREE.BackSide

});
const bg = new THREE.Mesh( bgGeometry, bgMaterial );
bg.position.z = -40
bg.position.y = -10
bg.position.x = 20
bg.rotation.y =  Math.PI * 0.35
scene.add( bg )

//-----------------------------------------------------------
//OVERLAY
//-----------------------------------------------------------

const planeGeometry = new THREE.PlaneGeometry( 2, 2 );
const planeMaterial = new THREE.MeshBasicMaterial( {
    color: 'black',
    transparent: true,
    opacity: 1,
});
const plane = new THREE.Mesh( planeGeometry, planeMaterial );
plane.position.z = -1
camera.add( plane )

//-----------------------------------------------------------
//POINTS
//-----------------------------------------------------------

setTimeout(function(){
    document.getElementById('div1').style.visibility = "visible";
    },12000);

//-----------------------------------------------------------
//RENDERER
//-----------------------------------------------------------

const renderer = new THREE.WebGLRenderer({
    alpha: true
})
renderer.setSize(sizes.width, sizes.height)
document.body.appendChild(renderer.domElement)
renderer.physicallyCorrectLights = true
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.domElement.classList.add('webgl')
document.body.appendChild(renderer.domElement)

//-----------------------------------------------------------
//LIGHTS
//-----------------------------------------------------------

const light = new THREE.AmbientLight( 0x404040 )
scene.add( light )

//-----------------------------------------------------------
//PARTICLES
//-----------------------------------------------------------

// Material

const particleTexture = textureLoader.load('/textures/star_04.png')

// Geometry

const particlesGeometry = new THREE.BufferGeometry()
const count = 50000

const position = new Float32Array(count * 3) 

for(let i = 0; i < count * 3; i++) 
{
    position[i * 3 + 0] = (Math.random() - 0.5) * 100 // x
    position[i * 3 + 1] = (Math.random() - 0.5) * 100 // y
    position[i * 3 + 2] = (Math.random() - 0.5) * 100 // z
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(position, 3)) 

const particlesMaterial = new THREE.PointsMaterial({
    size: 0.5,
    sizeAttenuation: true,
    color: new THREE.Color('#ff2222'),
    map: particleTexture,
    depthWrite: false,
    transparent: true,
    blending: THREE.AdditiveBlending

})

const particles = new THREE.Points( particlesGeometry, particlesMaterial )
scene.add(particles)

//-----------------------------------------------------------
//ENVMAP
//-----------------------------------------------------------

const pmremGenerator = new THREE.PMREMGenerator( renderer );
pmremGenerator.compileEquirectangularShader();

let environmentMap = null
exrLoader.load( 'textures/solitude_night_1k.exr', function ( texture ) {

    const exrCubeRenderTarget = pmremGenerator.fromEquirectangular( texture );
    environmentMap = exrCubeRenderTarget.texture;

    texture.dispose();
    // scene.background = environmentMap;
    loadModel()
});


//-----------------------------------------------------------
//MODELS
//-----------------------------------------------------------

let axe = null 
let isAxeLoaded = false

const loadModel = () => {
    gltfLoader.load(
        'models/axe.glb',
        (gltf) =>
        {
            axe=gltf.scene
            scene.add(axe)
            debug.add(axe.position, 'x')
            .min(-50)
            .max(50)
            gltf.scene.traverse((object) =>
            {
                if(object instanceof THREE.Mesh)
                {
                    object.material.envMap = environmentMap
                    object.material.envMapIntensity = 10
                    object.material.needsUpdate = true
                }
            })

            isAxeLoaded = true
            start()
        }
    )
}
let mixer = null
let isKratosLoaded = false
let action = null

gltfLoader.load(
    'models/animated-kratos.glb',
    (gltf) => {
        const kratos = gltf.scene
        scene.add(kratos)
        kratos.position.y = -20
        kratos.position.x = 40
        kratos.position.z = -15

        debug.add(kratos.position, 'x')
            .min(-50)
            .max(50)
        
        //animation
        mixer = new THREE.AnimationMixer(kratos)
        action = mixer.clipAction(gltf.animations[0])
        action.loop = THREE.LoopOnce
        action.clampWhenFinished = true
        mixer.addEventListener( 'finished', function( e ) {} );
        kratos.traverse((child) =>     
        {
            if(child.isMesh) {
                child.frustumCulled = false
                child.material.envMap = environmentMap
                child.material.envMapIntensity = 2
                child.material.needsUpdate = true
                child.material.color.set(0x333333)
            }
        })

        isKratosLoaded = true
        start()
    }
)


//-----------------------------------------------------------
//CURSOR
//-----------------------------------------------------------

const cursor = {}
cursor.x = 0
cursor.y = 0

window.addEventListener('mousemove', (event) =>
{
    cursor.x = event.clientX / sizes.width - 0.5
    cursor.y = event.clientY / sizes.height - 0.5
})

//-----------------------------------------------------------
//LOOP
//-----------------------------------------------------------

const clock = new THREE.Clock()
let previousTime = 0

const loop = () =>
{   
    const time = Date.now()
           
    //time
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    if(mixer)
    {
        mixer.update(deltaTime)
    }

    //Cursor camera
    const parallaxX = cursor.x * 0.5
    const parallaxY = - cursor.y * 0.5
    cameraGroup.position.x += (parallaxX - cameraGroup.position.x) * 5 * deltaTime
    cameraGroup.position.y += (parallaxY - cameraGroup.position.y) * 5 * deltaTime
    
    
    //Render
    renderer.render(scene, camera)
    
    //Tick on next frame
    window.requestAnimationFrame(loop)


    
}
loop()


//-----------------------------------------------------------
//START ANIMATION
//-----------------------------------------------------------

const start = () => {

    if ( isKratosLoaded && isAxeLoaded ) {
        window.requestAnimationFrame(() => { 
            window.requestAnimationFrame(() => {
                console.log('start')
                gsap.to(planeMaterial, {opacity:0, duration: 3, delay:0})
                action.play()
                gsap.fromTo(axe.position, { x : 35}, { x: -35, duration: 7, delay: 0 })
                gsap.fromTo(axe.position, { y : 5}, { y: 5  , duration: 7, delay: 0 })
                gsap.fromTo(axe.rotation, { z : 0}, { z: 13, duration: 7, delay: 0 })
                gsap.fromTo(camera.position, { x: -20.8, z: 28, y: 6.78}, { x: -39, z: 11.9, y: 7.7, duration: 7 })
                gsap.fromTo(camera.rotation, { x: -0.32, z: -0.25, y: -0.91}, { x: -0.2, z: -0.02, y: -0.13, duration: 7 })
            })
        })



    }

}