import * as CANNON from 'cannon';

export function initPhysics() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world.allowSleep = true;
  world.broadphase = new CANNON.SAPBroadphase(world);

  const materials = {
    ground: new CANNON.Material('ground'),
    wall: new CANNON.Material('wall'),
    ramp: new CANNON.Material('ramp'),
    robot: new CANNON.Material('robot'),
  };

  const contactPairs = [
    [materials.robot, materials.ground, { friction: 0.9, restitution: 0.0 }],
    [materials.robot, materials.wall, { friction: 0.7, restitution: 0.0 }],
    [materials.robot, materials.ramp, { friction: 0.95, restitution: 0.0 }],
    [materials.wall, materials.wall, { friction: 0.6, restitution: 0.0 }],
  ];

  contactPairs.forEach(([matA, matB, props]) => {
    world.addContactMaterial(new CANNON.ContactMaterial(matA, matB, props));
  });

  return { world, materials };
}