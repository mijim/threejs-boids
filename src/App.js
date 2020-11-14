import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from 'react-three-fiber';
import * as THREE from 'three';
import { Box, OrbitControls, Sphere, TransformControls } from 'drei';
import './App.css';

const boxLimit = 15;
let followMouseControl = false;
let maxVelocityControl =  0.05;
let cohesionVelControl = 1000;
let separationVelControl = 1000;
let alignmentVelControl = 1000;

const mouse = {
  x: 0,
  y: 0
}


//MATERIALS
const material = new THREE.MeshBasicMaterial({
  color: '#ff0000',
  opacity: 0.2,
  wireframe: true,
  transparent: true,
});

const material2 = new THREE.MeshBasicMaterial({
  color: new THREE.Color('#ffffff')
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

//Algorithm functions
const getCohesionVel = (currentBird) => {
  let resVec = new THREE.Vector3(0,0,0);

  currentBird.parent.children.forEach((bird) => {
    if(bird !== currentBird) {
      resVec = vectorSum(resVec, bird.position);
    }
  });
  resVec = vectorDivEscalar(resVec, currentBird.parent.children.length - 1);
  return vectorDivEscalar(vectorSubs(resVec, currentBird.position), cohesionVelControl)
}

const getSeparationVel = (currentBird) => {
  let resVec = new THREE.Vector3(0,0,0);
  currentBird.parent.children.forEach((bird) => {
    if(bird !== currentBird && bird.position.distanceTo(currentBird.position) < 2) {
      resVec = vectorSubs(resVec, vectorSubs(bird.position, currentBird.position))
    }
  });
  return vectorDivEscalar(resVec, separationVelControl);
}

const getAlignmentVel = (currentBird) => {
  let resVec = new THREE.Vector3(0,0,0);
  currentBird.parent.children.forEach((bird) => {
    if(bird !== currentBird) {
      resVec = vectorSum(resVec, currentBird.velocity);
    }
  });
  resVec = vectorDivEscalar(resVec, currentBird.parent.children.length - 1);
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

const getMousePositionVel = (currentBird) => {
  const resVec = new THREE.Vector3(-mouse.x * boxLimit * 2.2,mouse.y * boxLimit,0);
  return vectorDivEscalar(vectorSubs(resVec, currentBird.position),1000);
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



const Flock = ({ position, rotation }) => {
  const birdRef = useRef();

  useEffect(() => {
    birdRef.current.velocity = new THREE.Vector3(0,0,0);
  }, []);

  

  useFrame(() => {
    if (birdRef.current) {

      const velO = getCohesionVel(birdRef.current);
      const vel1 = getSeparationVel(birdRef.current);
      const vel2 = getAlignmentVel(birdRef.current);

      const vel3 = getBoundPosition(birdRef.current);
      //const vel4 = getWindVel();

      const velocitiesVector = [birdRef.current.velocity, velO, vel1,vel2,vel3];

      const vel5 = getMousePositionVel(birdRef.current);
      if(followMouseControl) {
        velocitiesVector.push(vel5);
      }


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
  const [followMouse, setFollowMouse] = useState(false);
  const [population, setPopulation] = useState(100);
  const [velocity, setVelocity] = useState(0.05);

  const [cohesionVel, setCohesionVel] = useState(1000);
  const [separationVel, setSeparationVel] = useState(1000);
  const [alignmentVel, setAlignmentVel] = useState(1000);

  const [openedCard, setOpenedCard] = useState(true);

  useEffect(() => {
    const mouseMove = (ev) => {
      mouse.x = ( ev.clientX / window.innerWidth ) * 2 - 1;
      mouse.y = - ( ev.clientY / window.innerHeight ) * 2 + 1;
    }
    document.addEventListener("mousemove", mouseMove);
    return () => document.removeEventListener("mousemove", mouseMove);
  }, []);

  useEffect(() => {
    followMouseControl = followMouse;
  }, [followMouse]);

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

  return (
    <div className="App">
      <div className="controls-container">
        <div className="controls-title" onClick={() => setOpenedCard(!openedCard)}>
          Three.js - Boids
        </div>
        {openedCard && (
          <>
        <div className="controls-control first-control">
          <div className="control-title">
            Follow mouse:
          </div>
          <div className="control-action">
          <label class="switch">
            <input type="checkbox"  checked={followMouse} onChange={() => {setFollowMouse(!followMouse)}}/>
            <span class="slider round"></span>
          </label>
          </div>
        </div>
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
        <directionalLight
          position={[2.5, 50, 5]}
          intensity={2}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={200}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <Box
          material={material}
          scale={[30, 30, 30]}
        />
        <OrbitControls />

        <group>
          <Suspense fallback={<Box />}>
            {Array(population).fill(null).map(() => (
              <Flock
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
