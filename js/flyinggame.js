var scene, camera, fieldOfView, aspectRatio, nearPlane, farPlane, renderer, container;
var sea, sky, airPlane;
var Height, Width;
var ambientLight, hemisphereLight, shadowLight;

var game;
var deltaTime = 0;
var newTime = new Date().getTime();
var oldTime = new Date().getTime();

var fieldDistance, fieldLevel, levelCircle, scoreValue;

var planeInitialRotation;

var lifeFraction = 1;

var collectedHearts = 0;
var heartImages = [];

function resetGame() {
	game = {
		speed: 0.001,
		distance: 0,
		level: 1,
		ratioSpeedDistance: 50,

		distanceForLevelUpdate: 1000,

		planeDefaultHeight: 100,

		ennemiesSpeed: .2,

		playerLife: 3,

		status: "playing",
		planeFallSpeed: .001,

	};
	fieldLevel.innerHTML = Math.floor(game.level);
}

function createScene() {
	Height = window.innerHeight;
	Width = window.innerWidth;
	renderer = new THREE.WebGLRenderer({
		alpha: true
	});
	renderer.setSize(Width, Height,);
	renderer.shadowMap.enabled = true;
	container = document.getElementById('world');
	container.appendChild(renderer.domElement);

	scene = new THREE.Scene();
	aspectRatio = Width / Height;
	fieldOfView = 60;
	nearPlane = 1; 
	farPlane = 10000;
	camera = new THREE.PerspectiveCamera(
		fieldOfView,
		aspectRatio,
		nearPlane,
		farPlane
	);
	camera.position.x = 0;
	camera.position.z = 200;
	camera.position.y = 100;

	window.addEventListener('resize', handleWindowResize, false);
}

function handleWindowResize() {

	Height = window.innerHeight;
	Width = window.innerWidth;
	renderer.setSize(Width, Height);
	camera.aspect = Width / Height;
	camera.updateProjectionMatrix();
}

function createLights() {

	hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, .9);

	ambientLight = new THREE.AmbientLight(0xdc8874, .5);

	shadowLight = new THREE.DirectionalLight(0xffffff, .9);
	shadowLight.position.set(150, 350, 350);
	shadowLight.castShadow = true;
	shadowLight.shadow.camera.left = -400;
	shadowLight.shadow.camera.right = 400;
	shadowLight.shadow.camera.top = 400;
	shadowLight.shadow.camera.bottom = -400;
	shadowLight.shadow.camera.near = 1;
	shadowLight.shadow.camera.far = 1000;
	shadowLight.shadow.mapSize.width = 4096;
	shadowLight.shadow.mapSize.height = 4096;

	scene.add(hemisphereLight);
	scene.add(shadowLight);
	scene.add(ambientLight);
}


Sea = function () {

	var geom = new THREE.CylinderGeometry(600, 650, 800, 40, 10);

	geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
	geom.mergeVertices();

	var l = geom.vertices.length;

	this.waves = [];

	for (var i = 0; i < l; i++) {
		var v = geom.vertices[i];
		this.waves.push({
			y: v.y,
			x: v.x,
			z: v.z,
			ang: Math.random() * Math.PI * 2, //0 to 2pie
			amp: 5 + Math.random() * 15, //distance the vertex will move
			speed: 0.016 + Math.random() * 0.032
		});
	};

	var textureLoader = new THREE.TextureLoader();
	var seaTexture = textureLoader.load("images/waves.jpg");
	var mat = new THREE.MeshPhongMaterial({
		//color: 0x73bdf0,
		map:seaTexture,
		transparent: true,
		opacity: .9,
		shading: THREE.FlatShading,
	});


	this.mesh = new THREE.Mesh(geom, mat);
	this.mesh.receiveShadow = true;
}

Sea.prototype.updateWaves = function () {

	var vert = this.mesh.geometry.vertices;
	var l = vert.length;

	for (var i = 0; i < l; i++) {
		var v = vert[i];

		var vprops = this.waves[i];

		v.x = vprops.x + Math.cos(vprops.ang) * vprops.amp;
		v.y = vprops.y + Math.sin(vprops.ang) * vprops.amp;

		vprops.ang += vprops.speed;

	}
	this.mesh.geometry.verticesNeedUpdate = true;

	sea.mesh.rotation.z += .005;
}

function createSea() {
	sea = new Sea();
	sea.mesh.position.y = -600;
	scene.add(sea.mesh);
}


Cloud = function () {
	this.mesh = new THREE.Object3D();
	var geom = new THREE.CircleGeometry(5, 32);

	var textureLoader = new THREE.TextureLoader();
	var cloudTexture = textureLoader.load("images/c.png");

	var mat = new THREE.MeshBasicMaterial({
		map: cloudTexture,
	});

	var m = new THREE.Mesh(geom, mat);
	m.position.x = 10;
	m.position.y = Math.random() * 10;
	m.position.z = Math.random() * 10;


	var s = 5 + Math.random() * 5;
	m.scale.set(s, s, s);

	m.castShadow = true;
	m.receiveShadow = true;
	this.mesh.add(m);

}

Sky = function () {

	this.mesh = new THREE.Object3D();

	this.nClouds = 30;

	var stepAngle = Math.PI * 2 / this.nClouds;

	for (var i = 0; i < this.nClouds; i++) {

		var c = new Cloud();

		var a = stepAngle * i;
		var h = 800 + Math.random() * 200;
		c.mesh.position.x = Math.cos(a) * h;
		c.mesh.position.y = Math.sin(a) * h;
		c.mesh.rotation.z = a + Math.PI / 2;
		c.mesh.position.z = -400 - Math.random() * 400;

		var s = 1 + Math.random() * 2;
		c.mesh.scale.set(s, s, s);

		var distanceFromCamera = Math.abs(c.mesh.position.z + 400);

		var opacityFactor = 1 - distanceFromCamera / 800;

		var minOpacity = 0.6;
		opacityFactor = Math.max(opacityFactor, minOpacity);

		c.mesh.traverse(function (child) {
			if (child instanceof THREE.Mesh) {
				child.material.opacity = opacityFactor;
				child.material.transparent = true;
			}
		});

		this.mesh.add(c.mesh);
	}
};

function createSky() {
	sky = new Sky();
	sky.mesh.position.y = -500;
	scene.add(sky.mesh);
}

var AirPlane = function () {
	this.mesh = new THREE.Object3D();
	this.mesh.name = "airPlane";

	//make cabin
	var geomCabin = new THREE.BoxGeometry(80, 50, 50, 1, 1, 1);
	var matCabin = new THREE.MeshPhongMaterial({
		color: 0x632e48,
		shading: THREE.FlatShading
	});

	geomCabin.vertices[4].y -= 10;
	geomCabin.vertices[4].z += 20;
	geomCabin.vertices[5].y -= 10;
	geomCabin.vertices[5].z -= 20;
	geomCabin.vertices[6].y += 30;
	geomCabin.vertices[6].z += 20;
	geomCabin.vertices[7].y += 30;
	geomCabin.vertices[7].z -= 20;

	var cabin = new THREE.Mesh(geomCabin, matCabin);
	cabin.castShadow = true;
	cabin.receiveShadow = true;
	this.mesh.add(cabin);

	//make engine
	var geomEngine = new THREE.BoxGeometry(20, 50, 50, 1, 1, 1);
	var matEngine = new THREE.MeshPhongMaterial({
		color: 0xdfd5da, shading: THREE.FlatShading
	});
	var engine = new THREE.Mesh(geomEngine, matEngine);
	engine.position.x = 50;
	engine.castShadow = true;
	engine.receiveShadow = true;
	this.mesh.add(engine);

	//make tailplane
	//var geomTailPlane = new THREE.BoxGeometry(15, 20, 5, 1, 1, 1);
	var geomTailPlane = new THREE.TetrahedronGeometry(15, 0);
	var matTailPlane = new THREE.MeshPhongMaterial({
		color: 0xa18191, shading: THREE.FlatShading
	});
	var tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
	tailPlane.position.set(-40, 20, 0);
	tailPlane.castShadow = true;
	tailPlane.receiveShadow = true;
	this.mesh.add(tailPlane);

	//make Wings
	var geomSideWing = new THREE.BoxGeometry(40, 8, 150, 1, 1, 1);
	var matSideWing = new THREE.MeshPhongMaterial({
		color: 0xa18191, shading: THREE.FlatShading
	});
	var sideWing = new THREE.Mesh(geomSideWing, matSideWing);
	sideWing.position.set(0, 15, 0);
	sideWing.castShadow = true;
	sideWing.receiveShadow = true;
	this.mesh.add(sideWing);

	//Propeller
	var geomPropeller = new THREE.BoxGeometry(20, 10, 10, 1, 1, 1);
	geomPropeller.vertices[4].y -= 5;
	geomPropeller.vertices[4].z += 5;
	geomPropeller.vertices[5].y -= 5;
	geomPropeller.vertices[5].z -= 5;
	geomPropeller.vertices[6].y += 5;
	geomPropeller.vertices[6].z += 5;
	geomPropeller.vertices[7].y += 5;
	geomPropeller.vertices[7].z -= 5;
	var matPropeller = new THREE.MeshPhongMaterial({
		color: 0xf6e9e9, shading: THREE.FlatShading
	});
	this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
	this.propeller.castShadow = true;
	this.propeller.receiveShadow = true;

	//Blades
	var geomBlade = new THREE.BoxGeometry(1, 100, 20, 1, 1, 1);
	var matBlade = new THREE.MeshPhongMaterial({
		color: 0x514C4C, shading: THREE.FlatShading
	});

	var blade1 = new THREE.Mesh(geomBlade, matBlade);
	blade1.position.set(8, 0, 0);
	blade1.castShadow = true;
	blade1.receiveShadow = true;

	var blade2 = blade1.clone();
	blade2.rotation.x = Math.PI / 2;
	blade2.castShadow = true;
	blade2.receiveShadow = true;

	this.propeller.add(blade1);
	this.propeller.add(blade2);
	this.propeller.position.set(60, 0, 0);
	this.mesh.add(this.propeller);

	var wheelProtecGeom = new THREE.BoxGeometry(30, 15, 10, 1, 1, 1);
	var wheelProtecMat = new THREE.MeshPhongMaterial({
		color: 0x632e48, shading: THREE.FlatShading
	});
	var wheelProtecR = new THREE.Mesh(wheelProtecGeom, wheelProtecMat);
	wheelProtecR.position.set(25, -20, 25);
	this.mesh.add(wheelProtecR);

	var wheelTireGeom = new THREE.CircleGeometry(15, 32);
	var textureLoader = new THREE.TextureLoader();
	var tireTexture = textureLoader.load("images/tire.png")
	var wheelTireMat = new THREE.MeshPhongMaterial({
		//color:0x23190f, 
		map: tireTexture,
		shading: THREE.FlatShading
	});
	var wheelTireR = new THREE.Mesh(wheelTireGeom, wheelTireMat);
	wheelTireR.position.set(25, -28, 25);

	var wheelAxisGeom = new THREE.CircleGeometry(7, 25);
	var wheelAxisMat = new THREE.MeshPhongMaterial({
		color: 0x23190f, shading: THREE.FlatShading
	});
	var wheelAxis = new THREE.Mesh(wheelAxisGeom, wheelAxisMat);
	wheelTireR.add(wheelAxis);

	this.mesh.add(wheelTireR);

	var wheelProtecL = wheelProtecR.clone();
	wheelProtecL.position.z = -wheelProtecR.position.z;
	this.mesh.add(wheelProtecL);

	var wheelTireL = wheelTireR.clone();
	wheelTireL.position.z = -wheelTireR.position.z;
	this.mesh.add(wheelTireL);

	var wheelTireB = wheelTireR.clone();
	wheelTireB.scale.set(.5, .5, .5);
	wheelTireB.position.set(-35, -5, 0);
	this.mesh.add(wheelTireB);

	var suspensionGeom = new THREE.BoxGeometry(4, 20, 4);
	suspensionGeom.applyMatrix(new THREE.Matrix4().makeTranslation(0, 10, 0))
	var suspensionMat = new THREE.MeshPhongMaterial({
		color: 0x632e48, shading: THREE.FlatShading
	});
	var suspension = new THREE.Mesh(suspensionGeom, suspensionMat);
	suspension.position.set(-35, -5, 0);
	suspension.rotation.z = -.3;
	this.mesh.add(suspension);

	this.mesh.castShadow = true;
	this.mesh.receiveShadow = true;
}

function createAirplane() {
	airplane = new AirPlane();
	airplane.mesh.scale.set(.25, .25, .25);
	airplane.mesh.position.y = game.planeDefaultHeight;
	planeInitialRotation = airplane.mesh.rotation.clone(); //for reset
	scene.add(airplane.mesh);
}

function updatePlane() {
	var targetY = normalize(mousePos.y,-.75,.75, 25, 175);
    var targetX = normalize(mousePos.x,-.75,.75,-50, 50);
    airplane.mesh.position.y += (targetY-airplane.mesh.position.y)*0.1;
	airplane.mesh.position.x += (targetX-airplane.mesh.position.x)*0.06;
    airplane.propeller.rotation.x += 0.3;
}

function updateCameraFOV(){
	var targetZoom = normalize(mousePos.x, -1, 1, 40, 80);
    camera.fov = targetZoom;
	camera.updateProjectionMatrix();
}

function normalize(v, vmin, vmax, tmin, tmax) {
	var nv = Math.max(Math.min(v, vmax), vmin);
	var dv = vmax - vmin;
	var pc = (nv - vmin) / dv;
	var dt = tmax - tmin;
	var tv = tmin + (pc * dt);
	return tv;
}


Ennemy = function () {

	var geom = new THREE.TetrahedronGeometry(8, 2);
	var textureLoader = new THREE.TextureLoader();
	var enemyTexture = textureLoader.load("images/stone.png");
	var mat = new THREE.MeshPhongMaterial({
		//color: 0x632e48,
		map: enemyTexture,
		shininess: 0,
		specular: 0xffffff,
		shading: THREE.FlatShading,
		receiveShadow: true,
	});
	this.mesh = new THREE.Mesh(geom, mat);
	this.mesh.castShadow = true;

}

var EnnemiesHolder = function () {
	this.mesh = new THREE.Object3D();
	this.ennemiesInUse = [];
}

EnnemiesHolder.prototype.spawnEnnemies = function () {
	var nEnnemies = 3;

	for (var i = 0; i < nEnnemies; i++) {
		var ennemy = new Ennemy();

		ennemy.mesh.position.x = Math.random() * Width;
		ennemy.mesh.position.y = camera.position.y + Math.random() * 100;

		ennemiesHolder.mesh.add(ennemy.mesh);
		ennemiesHolder.ennemiesInUse.push(ennemy);
	}
}

function createEnnemies() {
	ennemiesHolder = new EnnemiesHolder();
	scene.add(ennemiesHolder.mesh);
	//ennemiesHolder.spawnEnnemies();
}


function moveEnnemies() {

	for (var i = 0; i < ennemiesHolder.ennemiesInUse.length; i++) {
		var ennemy = ennemiesHolder.ennemiesInUse[i];

		ennemy.mesh.position.x -= game.ennemiesSpeed * deltaTime;

		if (ennemy.mesh.position.x < -Width) {
			ennemy.mesh.position.x = Width;
		}

		var distance = airplane.mesh.position.distanceTo(ennemy.mesh.position);

		var collisionThreshold = 20;

		if (distance < collisionThreshold) {

			if (lifeFraction > 0.5) {
				lifeFraction = 0.5;
				updateLifeUI();
			}
			else {
				game.playerLife--;
				lifeFraction = 1;
				updateLifeUI();
			}

			var rotationAngle = Math.PI / 10;
			airplane.mesh.rotation.z += rotationAngle;

			setTimeout(function () {
				airplane.mesh.rotation.copy(planeInitialRotation);
			}, 400);

			ennemiesHolder.mesh.remove(ennemy.mesh);
			ennemiesHolder.ennemiesInUse.splice(i, 1);
			i--;
		}
	}

}

function updateLifeUI() {
	var lifeContainer = document.getElementById("lifes");
	var heartImages = lifeContainer.querySelectorAll(".heart");

	for (var i = 0; i < heartImages.length; i++) {
		if (i < Math.floor(game.playerLife)) {
			heartImages[i].style.visibility = "visible";
			if (i ==  Math.floor(game.playerLife)- 1 && lifeFraction == 0.5) {
				heartImages[i].src = "images/halfhear.png"; // 0 1 2: 2 no. index heart is redued half
			}
		}
		else {
			heartImages[i].style.visibility = "hidden";
		}
	}
}

function showGameOverScreen() {
	var scoreValue = document.getElementById("gameoverdistValue");
	scoreValue.innerHTML = Math.floor(game.distance);
	var gameOverScreen = document.getElementById("gameOverScreen");
	gameOverScreen.style.display = "flex";

	document.addEventListener("click", function () {
		airplane.mesh.position.set(0, game.planeDefaultHeight, 0);
		airplane.mesh.rotation.copy(planeInitialRotation);
		resetGame();
		updateDistance();
		var heartImages = document.querySelectorAll(".heart");
		for (var i = 0; i < heartImages.length; i++) {
			heartImages[i].src = "images/hear.png";
			heartImages[i].style.visibility = "visible";
		}
		gameOverScreen.style.display = "none";
		document.removeEventListener("click", arguments.callee);
	});
}

function collecHeart() {
	for (var i = 0; i < heartImages.length; i++) {
		var heart = heartImages[i];
		heart.position.x -= .1 * deltaTime;

		if (heart.position.x < -Width) {

			heartImages.splice(i, 1);
			scene.remove(heart);
			i--;
		}
		var collisionThreshold = 20;
	
		var distanceToPlane = airplane.mesh.position.distanceTo(heart.position);
		if (distanceToPlane < collisionThreshold) {
			
			if (game.playerLife < 3) {
				collectedHearts += 0.5;
				game.playerLife += 0.5;
				console.log("Life increased by half")
			}

			heartImages.splice(i, 1);
			scene.remove(heart);
			i--;
			updateLifeUI();
		}
	}
}

function spawnHearts() {

	var textureLoader = new THREE.TextureLoader();
	var heartTexture = textureLoader.load("images/hear.png");


	var heartGeometry = new THREE.PlaneGeometry(25, 25);
	var heartMaterial = new THREE.MeshBasicMaterial({ map: heartTexture, transparent: true });

	var heart = new THREE.Mesh(heartGeometry, heartMaterial);
	heart.position.x = Math.random() * Width;
	heart.position.y = Math.random() * (Height - 25) + 25 * 0.5;
	heartImages.push(heart);
	scene.add(heart);

}


var enemiesSpawnedForDistance = {};
var collectedHeartsForDistance = {};

function animate() {
	newTime = new Date().getTime();
	deltaTime = newTime - oldTime;
	oldTime = newTime;

	if (game.status == "playing") {

		var roundedDistance = Math.floor(game.distance);
		if (roundedDistance % 100 == 0 && game.distance != 0 && !enemiesSpawnedForDistance[roundedDistance]) {
			enemiesSpawnedForDistance[roundedDistance] = true;
			ennemiesHolder.spawnEnnemies();
		}
		if (roundedDistance % 200 == 0 && game.distance != 0 && !collectedHeartsForDistance[roundedDistance]) {
			collectedHeartsForDistance[roundedDistance] = true;
			spawnHearts();
		}

		updatePlane();
		updateCameraFOV();
		updateDistance();

		sea.updateWaves();

		moveEnnemies();
		collecHeart();

		if (game.playerLife <= 0) {
			game.status = "gameover";
			showGameOverScreen();
		}

		updateLifeUI();

		if (game.distance > 1000 && game.distance <= 2000) {
			game.level = 2;
			fieldLevel.innerHTML = game.level;
			game.timeBetweenEnemySpawns *= 0.8; //20 percent less
		} 
		if (game.distance > 2000) {
			game.timeBetweenEnemySpawns *= 0.7;
			game.level = 3;
			fieldLevel.innerHTML = game.level;
		}
		if (game.distance > 3000) {
			game.status = "gameover";
			showGameOverScreen();
		}

	}

	sky.mesh.rotation.z += .006;

	if (game.status == "gameover") {
		airplane.mesh.rotation.z += (-Math.PI / 2 - airplane.mesh.rotation.z) * .0002 * deltaTime;
		airplane.mesh.rotation.x += 0.0003 * deltaTime;
		game.planeFallSpeed *= 1.05;
		airplane.mesh.position.y -= game.planeFallSpeed * deltaTime;
		airplane.mesh.castShadow = true;

		for (var i = 0; i < ennemiesHolder.ennemiesInUse.length; i++) {
			var ennemy = ennemiesHolder.ennemiesInUse[i];
			ennemiesHolder.mesh.remove(ennemy.mesh);
		}
		ennemiesHolder.ennemiesInUse = [];

	}

	renderer.render(scene, camera);
	requestAnimationFrame(animate);

}

function updateDistance() {
	game.distance += game.speed * deltaTime * game.ratioSpeedDistance;
	fieldDistance.innerHTML = Math.floor(game.distance);
	var d = 502 * (1 - (game.distance % game.distanceForLevelUpdate) / game.distanceForLevelUpdate);
	levelCircle.setAttribute("stroke-dashoffset", d);
}

function init(event) {
	document.addEventListener('mousemove', handleMouseMove, false);
	fieldDistance = document.getElementById("distValue");
	fieldLevel = document.getElementById("levelValue");
	levelCircle = document.getElementById("levelCircleStroke");

	resetGame();
	createScene();
	createAirplane();
	createLights();
	createSea();
	createSky();
	createEnnemies();

	animate();

}

var mousePos = { x: 0, y: 0 };
function handleMouseMove(event) {
	var tx = -1 + (event.clientX / Width) * 2;
	var ty = 1 - (event.clientY / Height) * 2;
	mousePos = { x: tx, y: ty };
}

window.addEventListener('load', init, false);