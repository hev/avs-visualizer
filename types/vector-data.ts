// Define the structure of a vector item
export interface VectorItem {
  id: string | number // Unique identifier for the item
  key: string // Key used to retrieve the data
  vector: number[] // The high-dimensional vector for distance calculations
  metadata: Record<string, any> // Any additional metadata about the item
  clusters: string[] // List of clusters this item belongs to (can be multiple)
}

// Define the structure for processed vector data with position
export interface ProcessedVectorItem extends VectorItem {
  position: [number, number, number] // 3D position after dimension reduction
  primaryCluster?: string // Primary cluster for coloring
  clusterIndex?: number // Index of the primary cluster in the colors array
}

// Cluster information with count
export interface ClusterInfo {
  name: string
  count: number
}

// Field metadata for coloring options
export interface FieldMetadata {
  name: string
  values: string[]
  counts: Record<string, number>
}

