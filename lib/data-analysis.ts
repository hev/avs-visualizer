import type { VectorItem, ClusterInfo, FieldMetadata } from "@/types/vector-data"

// Get top clusters from data
export function getTopClusters(data: VectorItem[], maxClusters = 10): ClusterInfo[] {
  const clusterCounts: Record<string, number> = {}

  // Count occurrences of each cluster
  data.forEach((item) => {
    item.clusters.forEach((cluster) => {
      clusterCounts[cluster] = (clusterCounts[cluster] || 0) + 1
    })
  })

  // Convert to array and sort by count (descending)
  const clusterStats = Object.entries(clusterCounts).map(([name, count]) => ({
    name,
    count,
  }))

  // Return top N clusters
  return clusterStats.sort((a, b) => b.count - a.count).slice(0, maxClusters)
}

// Analyze metadata fields to find low-cardinality fields suitable for coloring
export function analyzeMetadataFields(data: VectorItem[], maxCardinality = 10): FieldMetadata[] {
  if (!data.length) return []

  const fieldCounts: Record<string, Record<string, number>> = {}

  // First pass: collect all field values and their counts
  data.forEach((item) => {
    Object.entries(item.metadata).forEach(([field, value]) => {
      // Skip arrays, objects, and null/undefined values
      if (value === null || value === undefined || typeof value === "object") return

      // Convert value to string for consistency
      const strValue = String(value)

      // Initialize field if not exists
      if (!fieldCounts[field]) fieldCounts[field] = {}

      // Increment count for this value
      fieldCounts[field][strValue] = (fieldCounts[field][strValue] || 0) + 1
    })
  })

  // Second pass: filter fields with low cardinality
  const lowCardinalityFields: FieldMetadata[] = []

  Object.entries(fieldCounts).forEach(([field, valueCounts]) => {
    const uniqueValues = Object.keys(valueCounts)

    // Only include fields with reasonable cardinality
    if (uniqueValues.length >= 2 && uniqueValues.length <= maxCardinality) {
      lowCardinalityFields.push({
        name: field,
        values: uniqueValues,
        counts: valueCounts,
      })
    }
  })

  // Always include clusters as an option
  lowCardinalityFields.unshift({
    name: "clusters",
    values: Array.from(new Set(data.flatMap((item) => item.clusters))).slice(0, maxCardinality),
    counts: {},
  })

  return lowCardinalityFields
}

// Get color mapping for a specific field
export function getColorMapping(
  data: VectorItem[],
  field: string,
  colors: string[],
): { mapping: Record<string, string>; values: string[] } {
  // Special case for clusters field
  if (field === "clusters") {
    const topClusters = getTopClusters(data, colors.length)
    const mapping: Record<string, string> = {}

    topClusters.forEach((cluster, index) => {
      mapping[cluster.name] = colors[index % colors.length]
    })

    return {
      mapping,
      values: topClusters.map((c) => c.name),
    }
  }

  // For regular metadata fields
  const uniqueValues = new Set<string>()

  // Collect all unique values for this field
  data.forEach((item) => {
    if (item.metadata[field] !== undefined && item.metadata[field] !== null) {
      uniqueValues.add(String(item.metadata[field]))
    }
  })

  // Create mapping of values to colors
  const values = Array.from(uniqueValues)
  const mapping: Record<string, string> = {}

  values.forEach((value, index) => {
    mapping[value] = colors[index % colors.length]
  })

  return { mapping, values }
}

// Get color for an item based on selected field
export function getItemColor(
  item: VectorItem,
  field: string,
  colorMapping: Record<string, string>,
  defaultColor: string,
): string {
  if (field === "clusters" && item.clusters.length > 0) {
    // Find the first cluster that has a color mapping
    for (const cluster of item.clusters) {
      if (colorMapping[cluster]) {
        return colorMapping[cluster]
      }
    }
  } else if (item.metadata[field] !== undefined && item.metadata[field] !== null) {
    const value = String(item.metadata[field])
    if (colorMapping[value]) {
      return colorMapping[value]
    }
  }

  return defaultColor
}

