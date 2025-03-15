import type { ProcessedVectorItem, VectorItem } from "../types/vector-data"

// Project vectors to 3D space by using 1/3 of dimensions for each axis
export function projectVectorsTo3D(data: VectorItem[]): ProcessedVectorItem[] {
  return data.map((item) => {
    const vector = item.vector
    const dimensions = vector.length

    // Calculate how many dimensions to use for each axis
    const dimPerAxis = Math.floor(dimensions / 3)
    const remainder = dimensions % 3

    // Adjust dimensions per axis to account for remainder
    const xDims = dimPerAxis + (remainder > 0 ? 1 : 0)
    const yDims = dimPerAxis + (remainder > 1 ? 1 : 0)
    const zDims = dimPerAxis

    // Calculate position by averaging each third of the dimensions
    const position: [number, number, number] = [
      // X coordinate: average of first third of dimensions
      vector.slice(0, xDims).reduce((sum, val) => sum + val, 0) / xDims,

      // Y coordinate: average of second third of dimensions
      vector.slice(xDims, xDims + yDims).reduce((sum, val) => sum + val, 0) / yDims,

      // Z coordinate: average of final third of dimensions
      vector.slice(xDims + yDims).reduce((sum, val) => sum + val, 0) / zDims,
    ]

    // Scale the position to fit in a reasonable range
    const scale = 5
    const scaledPosition: [number, number, number] = [position[0] * scale, position[1] * scale, position[2] * scale]

    return {
      ...item,
      position: scaledPosition,
      primaryCluster: item.clusters[0], // Use first cluster as primary for initial coloring
    }
  })
}

