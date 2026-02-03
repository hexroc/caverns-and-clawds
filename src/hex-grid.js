/**
 * STUB: hex-grid.js removed (visual combat cut)
 * This stub prevents import errors while we rebuild text-based system
 */

const HexGrid = null;
const hex = () => ({ q: 0, r: 0 });
const hexDistance = () => 0;
const hexNeighbors = () => [];
const TERRAIN = {};
const generateRoom = () => ({ tiles: new Map() });
const seededRandom = (seed) => () => Math.random();

module.exports = {
  HexGrid,
  hex,
  hexDistance,
  hexNeighbors,
  TERRAIN,
  generateRoom,
  seededRandom
};
