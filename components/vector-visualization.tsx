"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Text } from "@react-three/drei"
import { Vector3 } from "three"
import { ChevronLeft, Settings, X } from "lucide-react"
import { projectVectorsTo3D } from "@/lib/dimension-reduction"
import { analyzeMetadataFields, getColorMapping, getItemColor } from "@/lib/data-analysis"
import type { ProcessedVectorItem, VectorItem, FieldMetadata } from "@/types/vector-data"

// Define colors for different values
const COLORS = [
  "#FF5733", // Red-orange
  "#33FF57", // Green
  "#3357FF", // Blue
  "#F033FF", // Purple
  "#FFFF33", // Yellow
  "#33FFF5", // Cyan
  "#FF33A8", // Pink
  "#A833FF", // Violet
  "#FF8C33", // Orange
  "#33FFB8", // Teal
]

// API endpoint configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"
const VECTORS_ENDPOINT = `${API_BASE_URL}/api/vectors`

// Fetch vector data from the Go backend
async function fetchVectorData(limit = 500, dimensions = 100): Promise<VectorItem[]> {
  try {
    // Build query parameters
    const params = new URLSearchParams()
    params.append("limit", limit.toString())
    params.append("dimensions", dimensions.toString())

    // Make API request
    const response = await fetch(`${VECTORS_ENDPOINT}?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Return the data array from the response
    return data.data || []
  } catch (error) {
    console.error("Error fetching vector data:", error)
    throw error
  }
}

// Point component with hover effect
function DataPoint({ point, setHovered, colorField, colorMapping, defaultColor }) {
  const ref = useRef()
  const [hovered, setHoveredLocal] = useState(false)

  // Get color based on selected field
  const color = getItemColor(point, colorField, colorMapping, defaultColor)

  return (
    <mesh
      ref={ref}
      position={point.position}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHoveredLocal(true)
        setHovered(point)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        setHoveredLocal(false)
        setHovered(null)
      }}
    >
      <sphereGeometry args={[hovered ? 0.08 : 0.03, 16, 16]} />
      <meshStandardMaterial color={color} emissive={hovered ? color : "black"} emissiveIntensity={hovered ? 0.5 : 0} />
    </mesh>
  )
}

// Tooltip component
function Tooltip({ point }) {
  const { camera } = useThree()
  const [position, setPosition] = useState([0, 0, 0])

  useFrame(() => {
    if (point) {
      // Position the tooltip above the point
      const pos = new Vector3(point.position[0], point.position[1] + 0.5, point.position[2])
      pos.project(camera)
      setPosition([point.position[0], point.position[1] + 0.5, point.position[2]])
    }
  })

  if (!point) return null

  const { metadata, clusters, key } = point

  // Format metadata for display
  const metadataEntries = Object.entries(metadata)
    .filter(([k, v]) => typeof v !== "object" && k !== "tags" && k !== "created" && k !== "isActive")
    .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`)

  return (
    <group position={position}>
      <Text
        position={[0, 0.4, 0]}
        fontSize={0.15}
        color="black"
        anchorX="center"
        anchorY="middle"
        backgroundColor="#ffffff80"
        padding={0.05}
        billboard={true}
      >
        {metadata.name}
      </Text>
      <Text
        position={[0, 0.2, 0]}
        fontSize={0.12}
        color="black"
        anchorX="center"
        anchorY="middle"
        backgroundColor="#ffffff80"
        padding={0.05}
        billboard={true}
      >
        {`Key: ${key} • Clusters: ${clusters.join(", ")}`}
      </Text>
      <Text
        position={[0, 0, 0]}
        fontSize={0.12}
        color="black"
        anchorX="center"
        anchorY="middle"
        backgroundColor="#ffffff80"
        padding={0.05}
        billboard={true}
      >
        {metadataEntries.slice(0, 2).join(" • ")}
      </Text>
      <Text
        position={[0, -0.2, 0]}
        fontSize={0.12}
        color="black"
        anchorX="center"
        anchorY="middle"
        backgroundColor="#ffffff80"
        padding={0.05}
        billboard={true}
      >
        {metadataEntries.slice(2, 4).join(" • ")}
      </Text>
      {metadata.tags && metadata.tags.length > 0 && (
        <Text
          position={[0, -0.4, 0]}
          fontSize={0.12}
          color="black"
          anchorX="center"
          anchorY="middle"
          backgroundColor="#ffffff80"
          padding={0.05}
          billboard={true}
        >
          {`Tags: ${metadata.tags.join(", ")}`}
        </Text>
      )}
    </group>
  )
}

// Scene component
function Scene({ numPoints, colorField, onFieldsAnalyzed, onColorMappingUpdate }) {
  const [hoveredPoint, setHoveredPoint] = useState<ProcessedVectorItem | null>(null)
  const [data, setData] = useState<ProcessedVectorItem[]>([])
  const [rawData, setRawData] = useState<ProcessedVectorItem[]>([])
  const [colorableFields, setColorableFields] = useState<FieldMetadata[]>([])
  const [colorMapping, setColorMapping] = useState<Record<string, string>>({})
  const [colorValues, setColorValues] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Function to update color mapping based on field without changing positions
  const updateColorMapping = useCallback(
    (rawData, field) => {
      if (rawData.length > 0 && field) {
        const { mapping, values } = getColorMapping(rawData, field, COLORS)
        setColorMapping(mapping)
        setColorValues(values)

        // Pass the updated color mapping to parent component
        if (onColorMappingUpdate) {
          onColorMappingUpdate(mapping, values)
        }
      }
    },
    [onColorMappingUpdate],
  )

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch raw vector data from the API service
        const fetchedData = await fetchVectorData(numPoints, 100)

        setRawData(fetchedData)

        // Process the data with dimension reduction - positions based only on vectors
        const processedData = projectVectorsTo3D(fetchedData)
        setData(processedData)

        // Analyze metadata fields for coloring options
        const fields = analyzeMetadataFields(fetchedData)
        setColorableFields(fields)

        // Notify parent component about available fields
        if (onFieldsAnalyzed) {
          onFieldsAnalyzed(fields)
        }

        // Set initial color mapping
        updateColorMapping(fetchedData, colorField || "clusters")
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load data from API. Please check if the backend server is running.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [numPoints, onFieldsAnalyzed, updateColorMapping, colorField])

  // Update color mapping when color field changes, but don't change positions
  useEffect(() => {
    if (rawData.length > 0) {
      updateColorMapping(rawData, colorField)
    }
  }, [colorField, rawData, updateColorMapping])

  if (loading && data.length === 0) {
    return (
      <Text position={[0, 0, 0]} fontSize={0.5} color="black" anchorX="center" anchorY="middle" billboard={true}>
        Loading data from API...
      </Text>
    )
  }

  if (error) {
    return (
      <Text position={[0, 0, 0]} fontSize={0.5} color="red" anchorX="center" anchorY="middle" billboard={true}>
        {error}
      </Text>
    )
  }

  return (
    <>
      {data.map((point) => (
        <DataPoint
          key={point.id}
          point={point}
          setHovered={setHoveredPoint}
          colorField={colorField}
          colorMapping={colorMapping}
          defaultColor="#CCCCCC"
        />
      ))}
      <Tooltip point={hoveredPoint} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <OrbitControls />
    </>
  )
}

// Axes component
function Axes() {
  const axisLength = 10

  return (
    <group>
      {/* X Axis - Red */}
      <line>
        <bufferGeometry attach="geometry" args={[new Float32Array([-axisLength, 0, 0, axisLength, 0, 0]), 2]} />
        <lineBasicMaterial attach="material" color="red" linewidth={2} />
      </line>
      <Text position={[axisLength + 0.5, 0, 0]} fontSize={0.5} color="red" billboard={true}>
        X
      </Text>

      {/* Y Axis - Green */}
      <line>
        <bufferGeometry attach="geometry" args={[new Float32Array([0, -axisLength, 0, 0, axisLength, 0]), 2]} />
        <lineBasicMaterial attach="material" color="green" linewidth={2} />
      </line>
      <Text position={[0, axisLength + 0.5, 0]} fontSize={0.5} color="green" billboard={true}>
        Y
      </Text>

      {/* Z Axis - Blue */}
      <line>
        <bufferGeometry attach="geometry" args={[new Float32Array([0, 0, -axisLength, 0, 0, axisLength]), 2]} />
        <lineBasicMaterial attach="material" color="blue" linewidth={2} />
      </line>
      <Text position={[0, 0, axisLength + 0.5]} fontSize={0.5} color="blue" billboard={true}>
        Z
      </Text>

      {/* Grid */}
      <gridHelper args={[20, 20, "gray", "gray"]} rotation={[0, 0, 0]} />
    </group>
  )
}

// Controls panel
function ControlPanel({
  numPoints,
  setNumPoints,
  colorField,
  setColorField,
  colorableFields,
  onRegenerate,
  isVisible,
  onToggle,
}) {
  return (
    <div
      className={`absolute top-4 left-4 bg-white text-gray-800 p-4 rounded-lg z-10 shadow-md max-w-xs transition-all duration-300 ${
        isVisible ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Vector Data Visualization</h2>
        <button
          onClick={onToggle}
          className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="Close panel"
        >
          <X size={18} />
        </button>
      </div>

      <p className="mb-4 text-sm">Visualizing high-dimensional vector data in 3D space</p>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="numPoints" className="text-sm font-medium">
            Number of Vectors: {numPoints}
          </label>
        </div>
        <input
          id="numPoints"
          type="range"
          min="100"
          max="2000"
          step="100"
          value={numPoints}
          onChange={(e) => setNumPoints(Number.parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <label htmlFor="colorField" className="text-sm font-medium">
            Color By:
          </label>
        </div>
        <select
          id="colorField"
          value={colorField}
          onChange={(e) => setColorField(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md text-sm"
        >
          {colorableFields.map((field) => (
            <option key={field.name} value={field.name}>
              {field.name === "clusters" ? "Clusters" : field.name.charAt(0).toUpperCase() + field.name.slice(1)}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">Changing colors does not affect vector positions</p>
      </div>

      <div className="mb-4">
        <p className="text-sm mb-1">Instructions:</p>
        <ul className="text-xs list-disc pl-4">
          <li>Drag to rotate the view</li>
          <li>Scroll to zoom in/out</li>
          <li>Hover over points to see vector metadata</li>
          <li>Change "Color By" to visualize different aspects</li>
        </ul>
      </div>

      <button
        onClick={onRegenerate}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm w-full"
      >
        Generate New Data
      </button>
    </div>
  )
}

// Toggle button for control panel
function ControlPanelToggle({ isVisible, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`absolute top-4 left-4 z-20 bg-white text-gray-800 p-2 rounded-lg shadow-md transition-all duration-300 ${
        isVisible ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-label="Open settings"
    >
      <Settings size={20} />
    </button>
  )
}

// Legend component
function Legend({ colorField, colorMapping, colorValues, isVisible, onToggle }) {
  return (
    <div
      className={`absolute bottom-4 right-4 bg-white text-gray-800 p-4 rounded-lg z-10 shadow-md transition-all duration-300 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold">
          {colorField === "clusters" ? "Clusters" : colorField.charAt(0).toUpperCase() + colorField.slice(1)}
        </h3>
        <button
          onClick={onToggle}
          className="p-1 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="Close legend"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
        {colorValues && colorValues.length > 0 ? (
          colorValues.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: colorMapping[value] || "#CCCCCC" }}></div>
              <span className="text-xs">{value}</span>
            </div>
          ))
        ) : (
          <div className="text-xs text-gray-500">No data available</div>
        )}
      </div>
    </div>
  )
}

// Toggle button for legend
function LegendToggle({ isVisible, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`absolute bottom-4 right-4 z-20 bg-white text-gray-800 p-2 rounded-lg shadow-md transition-all duration-300 ${
        isVisible ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-label="Show legend"
    >
      <ChevronLeft size={20} />
    </button>
  )
}

// Connection status indicator
function ConnectionStatus({ connected }) {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-md">
      <div className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}></div>
      <span className="text-xs font-medium">{connected ? "Connected to API" : "API Disconnected"}</span>
    </div>
  )
}

// Main component
export default function VectorVisualization() {
  const [key, setKey] = useState(0)
  const [numPoints, setNumPoints] = useState(500)
  const [colorField, setColorField] = useState("clusters")
  const [colorableFields, setColorableFields] = useState<FieldMetadata[]>([])
  const [colorMapping, setColorMapping] = useState<Record<string, string>>({})
  const [colorValues, setColorValues] = useState<string[]>([])
  const [controlPanelVisible, setControlPanelVisible] = useState(true)
  const [legendVisible, setLegendVisible] = useState(true)
  const [connected, setConnected] = useState(false)

  // Check API connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/vectors?limit=1`)
        setConnected(response.ok)
      } catch (error) {
        setConnected(false)
      }
    }

    checkConnection()
    const interval = setInterval(checkConnection, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [])

  const handleRegenerate = () => {
    setKey((prev) => prev + 1)
  }

  // Handle fields analysis from Scene component - memoize to prevent infinite loops
  const handleFieldsAnalyzed = useCallback(
    (fields: FieldMetadata[]) => {
      setColorableFields(fields)

      // If current colorField is not in the available fields, reset to clusters
      if (fields.length > 0 && !fields.some((f) => f.name === colorField)) {
        setColorField(fields[0].name)
      }
    },
    [colorField],
  )

  // Handle color mapping update from Scene component - memoize to prevent infinite loops
  const handleColorMappingUpdate = useCallback((mapping: Record<string, string>, values: string[]) => {
    setColorMapping(mapping)
    setColorValues(values)
  }, [])

  return (
    <div className="w-full h-screen bg-gray-100">
      <Canvas key={key} camera={{ position: [0, 0, 15], fov: 50 }}>
        <Scene
          numPoints={numPoints}
          colorField={colorField}
          onFieldsAnalyzed={handleFieldsAnalyzed}
          onColorMappingUpdate={handleColorMappingUpdate}
        />
        <Axes />
      </Canvas>

      {/* Connection Status Indicator */}
      <ConnectionStatus connected={connected} />

      {/* Control Panel and Toggle */}
      <ControlPanelToggle isVisible={controlPanelVisible} onToggle={() => setControlPanelVisible(true)} />
      <ControlPanel
        numPoints={numPoints}
        setNumPoints={setNumPoints}
        colorField={colorField}
        setColorField={setColorField}
        colorableFields={colorableFields}
        onRegenerate={handleRegenerate}
        isVisible={controlPanelVisible}
        onToggle={() => setControlPanelVisible(false)}
      />

      {/* Legend and Toggle */}
      <LegendToggle isVisible={legendVisible} onToggle={() => setLegendVisible(true)} />
      <Legend
        colorField={colorField}
        colorMapping={colorMapping}
        colorValues={colorValues}
        isVisible={legendVisible}
        onToggle={() => setLegendVisible(false)}
      />
    </div>
  )
}

