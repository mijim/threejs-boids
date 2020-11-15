import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from 'react-three-fiber';
import * as THREE from 'three';
import { Box, OrbitControls, Sphere, TransformControls } from 'drei';
import './App.css';
import { Vector2 } from 'three';

let boxLimit = 15;
let followLeaderControl = false;
let followLeaVelControl = 1000;
let maxVelocityControl =  0.05;
let cohesionVelControl = 1000;
let separationVelControl = 1000;
let alignmentVelControl = 1000;
let fieldOfViewControl = 15;
let separationDistanceControl = 2;


//MATERIALS
const texture = new THREE.TextureLoader().load( 'cube_texture.png' );
const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.DoubleSide,
  transparent: true,
});

const material2 = new THREE.MeshBasicMaterial({
  color: new THREE.Color('#ffffff')
});

const material3 = new THREE.MeshBasicMaterial({
  color: '#ff0000',
});

//Aux functions
const getRandomNumber = (max, min) => {
  return Math.floor(Math.random() * (max - min)) + min;
}

const multipleVectorSum = (vecArray) => {
  let resVector = new THREE.Vector3(0,0,0);
  vecArray.forEach((vec) => {
    resVector = vectorSum(resVector, vec);
  })
  return resVector;
}

const vectorSum = (v1, v2) => {
    const resVector = new THREE.Vector3(0,0,0);
    resVector.x = v1.x + v2.x;
    resVector.y = v1.y + v2.y;
    resVector.z = v1.z + v2.z;
    return resVector;
}

const vectorSubs = (v1, v2) => {
  const resVector = new THREE.Vector3(0,0,0);
  resVector.x = v1.x - v2.x;
  resVector.y = v1.y - v2.y;
  resVector.z = v1.z - v2.z;
  return resVector;
}

const vectorDivEscalar = (v1, n) => {
  const resVector = new THREE.Vector3(0,0,0);
  resVector.x = v1.x / n;
  resVector.y = v1.y / n;
  resVector.z = v1.z / n;
  return resVector;
}

const vectorMultEscalar = (v1, n) => {
  const resVector = new THREE.Vector3(0,0,0);
  resVector.x = v1.x * n;
  resVector.y = v1.y * n;
  resVector.z = v1.z * n;
  return resVector;
}

const vectorMagnitude = (v) => {
  return Math.sqrt(Math.pow(v.x, 2), Math.pow(v.y, 2), Math.pow(v.z, 2), )
}

const getNearBirds = (birds, currentBird) => {
  //birds[0].material = material;
  let resBirds = [];
  birds.forEach((bird) => {
    if(currentBird.position.distanceTo(bird.position) < fieldOfViewControl) {
      resBirds.push(bird);
    }
  });
  return resBirds;
  //return birds;
}

//Algorithm functions
const getCohesionVel = (currentBird) => {
  let resVec = new THREE.Vector3(0,0,0);
  const nearBirds = getNearBirds(currentBird.parent.children, currentBird);
  nearBirds.forEach((bird) => {
    if(bird !== currentBird) {
      resVec = vectorSum(resVec, bird.position);
    }
  });
  resVec = vectorDivEscalar(resVec, nearBirds.length - 1);
  return vectorDivEscalar(vectorSubs(resVec, currentBird.position), cohesionVelControl)
}

const getSeparationVel = (currentBird) => {
  let resVec = new THREE.Vector3(0,0,0);
  const nearBirds = getNearBirds(currentBird.parent.children, currentBird);
  nearBirds.forEach((bird) => {
    if(bird !== currentBird && bird.position.distanceTo(currentBird.position) < separationDistanceControl) {
      resVec = vectorSubs(resVec, vectorSubs(bird.position, currentBird.position))
    }
  });
  return vectorDivEscalar(resVec, separationVelControl);
}

const getAlignmentVel = (currentBird) => {
  let resVec = new THREE.Vector3(0,0,0);
  const nearBirds = getNearBirds(currentBird.parent.children, currentBird);
  nearBirds.forEach((bird) => {
    if(bird !== currentBird) {
      resVec = vectorSum(resVec, currentBird.velocity);
    }
  });
  resVec = vectorDivEscalar(resVec, nearBirds.length - 1);
  return vectorDivEscalar(vectorSubs(resVec, currentBird.velocity), alignmentVelControl);
}

const limitVelocity = (currentBird) => {
  const vLimit = maxVelocityControl;
  const vecMagnitude = vectorMagnitude(currentBird.velocity)
  if(vecMagnitude > vLimit) {
    currentBird.velocity = vectorMultEscalar(vectorDivEscalar(currentBird.velocity, vecMagnitude), vLimit)
  }
}

const getWindVel = () => {
  return new THREE.Vector3(0.001,0,0);
}

const getBoundPosition = (currentBird) => {
  const bounds = 15;
  const velFactor = 0.01;
  const resVec = new THREE.Vector3(0,0,0);
  if(currentBird.position.x < -bounds) {
    resVec.x= velFactor
  } else if(currentBird.position.x > bounds) {
    resVec.x= -velFactor
  }
  if(currentBird.position.y < -bounds) {
    resVec.y= velFactor
  } else if(currentBird.position.y > bounds) {
    resVec.y= -velFactor
  }
  if(currentBird.position.z < -bounds) {
    resVec.z= velFactor
  } else if(currentBird.position.z > bounds) {
    resVec.z= -velFactor
  }
  return resVec;
}


const Flock = ({ position, rotation, index }) => {
  const birdRef = useRef();

  useEffect(() => {
    birdRef.current.velocity = new THREE.Vector3(0,0,0);
  }, []);

  const getRandomNum = (max, min) => {
    return (Math.random() * (max - min )) + min;
  }

  useFrame(() => {
    if (birdRef.current) {

      const vel0 = getCohesionVel(birdRef.current);
      const vel1 = getSeparationVel(birdRef.current);
      const vel2 = getAlignmentVel(birdRef.current);
      const vel3 = getBoundPosition(birdRef.current);
      let vel4 = new THREE.Vector3(0,0,0);

      //const vel4 = getWindVel();
      //const vel4 = getRandomVel();
      if(followLeaderControl && index === 0) {
        birdRef.current.material = material3;
        birdRef.current.scale.set(0.2, 0.2, 0.2);
      } else if(followLeaderControl) {
        vel4 = vectorDivEscalar(vectorSubs(birdRef.current.parent.children[0].position, birdRef.current.position), followLeaVelControl);
      } else if(index === 0){
        birdRef.current.material = material2;
        birdRef.current.scale.set(0.1, 0.02, 0.2);
      }

      if(!vel0.x || followLeaderControl && index === 0) {
        vel0.x = getRandomNum(0.02, -0.02);
        vel0.y = getRandomNum(0.02, -0.02);
        vel0.z = getRandomNum(0.02, -0.02);
      } 
      if(!vel1.x || followLeaderControl && index === 0) {
        vel1.x = getRandomNum(0.02, -0.02);
        vel1.y = getRandomNum(0.02, -0.02);
        vel1.z = getRandomNum(0.02, -0.02);
      } 
      if(!vel2.x || followLeaderControl && index === 0) {
        vel2.x = getRandomNum(0.02, -0.02);
        vel2.y = getRandomNum(0.02, -0.02);
        vel2.z = getRandomNum(0.02, -0.02);
      }

      const velocitiesVector = [birdRef.current.velocity, vel0, vel1,vel2,vel3, vel4];

      birdRef.current.velocity = multipleVectorSum(velocitiesVector);
      const newPosition = vectorSum(birdRef.current.velocity, birdRef.current.position);
      birdRef.current.lookAt(newPosition);
      birdRef.current.position.set(newPosition.x, newPosition.y, newPosition.z);
      limitVelocity(birdRef.current);

    }
  })
  return (
    <Box
      material={material2}
      scale={[0.1, 0.02, 0.2]}
      position={position}
      rotation={rotation}
      ref={birdRef}
    />
  )
}


function App() {
  const [followLeader, setFollowLeader] = useState(false);
  const [followLeadVel, setFollowLeadVel] = useState(1000);

  const [population, setPopulation] = useState(100);
  const [velocity, setVelocity] = useState(0.05);

  const [cohesionVel, setCohesionVel] = useState(1000);
  const [separationVel, setSeparationVel] = useState(1000);
  const [alignmentVel, setAlignmentVel] = useState(1000);

  const [separationDistance, setSeparationDistance] = useState(2);
  const [fieldOfView, setFieldOfView] = useState(15);

  const [openedCard, setOpenedCard] = useState(true);

  const [boxSize, setBoxSize] = useState(30);


  useEffect(() => {
    followLeaderControl = followLeader;
  }, [followLeader]);
  useEffect(() => {
    followLeaVelControl = followLeadVel;
  }, [followLeadVel]);
  useEffect(() => {
    maxVelocityControl = velocity;
  }, [velocity]);
  useEffect(() => {
    cohesionVelControl = cohesionVel;
  }, [cohesionVel]);
  useEffect(() => {
    separationVelControl = separationVel;
  }, [separationVel]);
  useEffect(() => {
    alignmentVelControl = alignmentVel;
  }, [alignmentVel]);
  useEffect(() => {
    separationDistanceControl = separationDistance;
  }, [separationDistance]);
  useEffect(() => {
    fieldOfViewControl = fieldOfView;
  }, [fieldOfView]);
  useEffect(() => {
    boxLimit = boxSize / 2;
  }, [boxSize]);

  return (
    <div className="App">
      <div className="controls-container">
        <div className="controls-title" onClick={() => setOpenedCard(!openedCard)}>
          Three.js - Boids
        </div>
        {openedCard && (
          <>
        <div className="controls-control">
          <div className="control-title">
            {`Population: (${population})`}
          </div>
          <div className="control-action slidecontainer">
            <input type="range" min="2" max="250" value={population.toString()} class="range-slider" id="myRange" onChange={(ev) => {
              setPopulation(parseInt(ev.target.value))
            }} />
          </div>
        </div>
        <div className="controls-control">
          <div className="control-title">
            {`Box size: (${Math.floor((boxSize-10)/90*100)}%)`}
          </div>
          <div className="control-action slidecontainer">
            <input type="range" min="10" max="100" value={boxSize.toString()} class="range-slider" id="myRange" onChange={(ev) => {
              setBoxSize(parseInt(ev.target.value))
            }} />
          </div>
        </div>
        <div className="controls-control">
          <div className="control-title">
            {`Max. Velocity: (${Math.floor(velocity * 100 / 0.1) || 1}%)`}
          </div>
          <div className="control-action slidecontainer">
            <input type="range" min="0" max="100" value={velocity * 100 / 0.1} class="range-slider" id="myRange" onChange={(ev) => {
              setVelocity((parseInt(ev.target.value) / 100) * 0.1);
            }} />
          </div>
        </div>
        <div className="controls-control">
          <div className="control-title">
            {`Cohesion velocity: (${Math.floor((2200 - cohesionVel)/20)}%)`}
          </div>
          <div className="control-action slidecontainer">
            <input type="range" min="200" max="2000" value={2200 - cohesionVel} class="range-slider" id="myRange" onChange={(ev) => {
              setCohesionVel(2200 - parseInt(ev.target.value))
            }} />
          </div>
        </div>
        <div className="controls-control">
          <div className="control-title">
            {`Separation velocity: (${Math.floor((2200 - separationVel)/20)}%)`}
          </div>
          <div className="control-action slidecontainer">
            <input type="range" min="200" max="2000" value={2200 - separationVel} class="range-slider" id="myRange" onChange={(ev) => {
              setSeparationVel(2200 - parseInt(ev.target.value))
            }} />
          </div>
        </div>
        <div className="controls-control">
          <div className="control-title">
            {`Alignment velocity: (${Math.floor((2200 - alignmentVel)/20)}%)`}
          </div>
          <div className="control-action slidecontainer">
            <input type="range" min="200" max="2000" value={2200 - alignmentVel} class="range-slider" id="myRange" onChange={(ev) => {
              setAlignmentVel(2200 - parseInt(ev.target.value))
            }} />
          </div>
        </div>
        <div className="controls-control">
          <div className="control-title">
            {`Separation distance: (${Math.floor(((separationDistance - 0.5) / 4.5) * 100)}%)`}
          </div>
          <div className="control-action slidecontainer">
            <input type="range" min="5" max="50" value={separationDistance*10} class="range-slider" id="myRange" onChange={(ev) => {
              setSeparationDistance(parseFloat(ev.target.value)/10)
            }} />
          </div>
        </div>
        <div className="controls-control">
          <div className="control-title">
            {`Field of view: (${Math.floor(((fieldOfView - 3) / 12) * 100)}%)`}
          </div>
          <div className="control-action slidecontainer">
            <input type="range" min="3" max="15" value={fieldOfView} class="range-slider" id="myRange" onChange={(ev) => {
              setFieldOfView(parseInt(ev.target.value))
            }} />
          </div>
        </div>
        <div className="controls-control first-control">
          <div className="control-title">
            Follow leader:
          </div>
          <div className="control-action">
          <label class="switch">
            <input type="checkbox"  checked={followLeader} onChange={() => {setFollowLeader(!followLeader)}}/>
            <span class="slider round"></span>
          </label>
          </div>
        </div>
        <div className="controls-control">
          <div className="control-title">
            {`Follow lead. velocity: (${Math.floor((2200 - followLeadVel)/20)}%)`}
          </div>
          <div className="control-action slidecontainer">
            <input type="range" min="200" max="2000" value={2200 - followLeadVel} class="range-slider" id="myRange" onChange={(ev) => {
              setFollowLeadVel(2200 - parseInt(ev.target.value))
            }} />
          </div>
        </div>
        <div className="controls-info">
          <div>
          Based on Crag Reynolds' 1986 Boids algorithm
          </div>
          <a href="https://migueljimenezbenajes.com/" target="_blank">
            Created by MJB 🐨
          </a>
        </div>
          </>
        )}
        
      </div>
      <Canvas
        id="mainCanvas"
        camera={{
          fov: 50,
          near: 0.001,
          rotation: [-1, 0, 0],
          position: [0,0,-30]
        }}
        shadowMap
      >
        {/* <directionalLight
          position={[2.5, 50, 5]}
          intensity={2}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={200}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        /> */}
        <Box
          material={material}
          scale={[boxSize, boxSize, boxSize]}
        />
        <OrbitControls />

        <group>
          <Suspense fallback={<Box />}>
            {Array(population).fill(null).map((elem, index) => (
              <Flock
                index={index}
                position={[getRandomNumber(boxLimit/2 , -boxLimit/2), getRandomNumber(boxLimit/2, -boxLimit/2), getRandomNumber(boxLimit/2, -boxLimit/2)]}
                rotation={[getRandomNumber(Math.PI, -Math.PI), getRandomNumber(Math.PI, -Math.PI), getRandomNumber(Math.PI, -Math.PI)]}
              />
            ))}
          </Suspense>
        </group>
      </Canvas>
    </div>
  );
}

export default App;
