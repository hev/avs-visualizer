import type { VectorItem, VectorDataService, FetchVectorDataParams } from "../types/vector-data"

// Sample clusters that could be used for any domain
const SAMPLE_CLUSTERS = [
  "Group A",
  "Group B",
  "Group C",
  "Group D",
  "Group E",
  "Group F",
  "Group G",
  "Group H",
  "Group I",
  "Group J",
]

// Sample metadata fields that could be used for any domain
const SAMPLE_METADATA = {
  names: [
    "Alpha",
    "Beta",
    "Gamma",
    "Delta",
    "Epsilon",
    "Zeta",
    "Eta",
    "Theta",
    "Iota",
    "Kappa",
    "Lambda",
    "Mu",
    "Nu",
    "Xi",
    "Omicron",
    "Pi",
    "Rho",
    "Sigma",
    "Tau",
    "Upsilon",
    "Phi",
    "Chi",
    "Psi",
    "Omega",
  ],
  attributes: [
    "Small",
    "Medium",
    "Large",
    "Extra Large",
    "Compact",
    "Expanded",
    "Basic",
    "Advanced",
    "Premium",
    "Standard",
    "Custom",
    "Regular",
    "Special",
    "Limited",
    "Unlimited",
  ],
  categories: [
    "Primary",
    "Secondary",
    "Tertiary",
    "Quaternary",
    "Quinary",
    "Senary",
    "Septenary",
    "Octonary",
    "Nonary",
    "Denary",
  ],
  types: ["Type A", "Type B", "Type C", "Type D", "Type E", "Type F", "Type G", "Type H", "Type I", "Type J"],
  ratings: [1, 2, 3, 4, 5],
  statuses: ["Active", "Inactive", "Pending", "Archived", "Draft"],
  priorities: ["Low", "Medium", "High", "Critical"],
  regions: ["North", "South", "East", "West", "Central"],
  departments: ["Sales", "Marketing", "Engineering", "Support", "Finance", "HR"],
}

// Helper function to get random item from array
const getRandomItem = (array: any[]) => array[Math.floor(Math.random() * array.length)]

// Helper function to get random items from array (1 to maxItems)
const getRandomItems = (array: any[], minItems = 1, maxItems = 3) => {
  const numItems = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems
  const shuffled = [...array].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, numItems)
}

// Helper function to get random number in range
const getRandomNumber = (min: number, max: number, decimals = 0) => {
  const value = Math.random() * (max - min) + min
  return Number(value.toFixed(decimals))
}

// Helper function to generate a random key
const generateRandomKey = (length = 8) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export class MockDataService implements VectorDataService {
  async fetchVectorData({ limit = 500, dimensions = 100 }: FetchVectorDataParams): Promise<VectorItem[]> {
    // Generate cluster centers (one per possible cluster)
    const clusterCenters = SAMPLE_CLUSTERS.map(() => Array.from({ length: dimensions }, () => Math.random() * 2 - 1))

    const data: VectorItem[] = []

    // Generate points
    for (let i = 0; i < limit; i++) {
      // Assign 1-3 clusters to this item
      const clusters = getRandomItems(SAMPLE_CLUSTERS, 1, 3)

      // Choose primary cluster for vector generation
      const primaryClusterIdx = SAMPLE_CLUSTERS.indexOf(clusters[0])
      const center = clusterCenters[primaryClusterIdx]

      // Generate a point near the cluster center
      const vector = center.map((val) => val + (Math.random() * 0.5 - 0.25))

      // Generate random metadata with low-cardinality fields for coloring options
      const metadata = {
        name: `${getRandomItem(SAMPLE_METADATA.attributes)} ${getRandomItem(SAMPLE_METADATA.names)}`,
        type: getRandomItem(SAMPLE_METADATA.types),
        category: getRandomItem(SAMPLE_METADATA.categories),
        rating: getRandomItem(SAMPLE_METADATA.ratings),
        value: getRandomNumber(10, 1000, 2),
        status: getRandomItem(SAMPLE_METADATA.statuses),
        priority: getRandomItem(SAMPLE_METADATA.priorities),
        region: getRandomItem(SAMPLE_METADATA.regions),
        department: getRandomItem(SAMPLE_METADATA.departments),
        created: new Date(Date.now() - getRandomNumber(0, 365 * 24 * 60 * 60 * 1000)).toISOString(),
        isActive: Math.random() > 0.2,
        score: getRandomNumber(1, 100),
        tags: getRandomItems(SAMPLE_METADATA.attributes, 0, 5),
      }

      // Add data point
      data.push({
        id: i,
        key: generateRandomKey(),
        vector,
        metadata,
        clusters,
      })
    }

    return data
  }
}

// Create a singleton instance
export const mockDataService = new MockDataService()

