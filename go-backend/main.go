package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strconv"
	"time"
)

// VectorItem represents a single vector with metadata
type VectorItem struct {
	ID       string                 `json:"id"`
	Key      string                 `json:"key"`
	Vector   []float64              `json:"vector"`
	Metadata map[string]interface{} `json:"metadata"`
	Clusters []string               `json:"clusters"`
}

// VectorDataResponse is the response structure for vector data
type VectorDataResponse struct {
	Data  []VectorItem `json:"data"`
	Total int          `json:"total"`
}

// ErrorResponse represents an API error
type ErrorResponse struct {
	Error string `json:"error"`
}

// Global variables for sample data
var (
	sampleClusters = []string{
		"Group A", "Group B", "Group C", "Group D", "Group E",
		"Group F", "Group G", "Group H", "Group I", "Group J",
	}

	sampleNames = []string{
		"Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa",
		"Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi", "Rho", "Sigma", "Tau", "Upsilon", "Phi",
		"Chi", "Psi", "Omega",
	}

	sampleAttributes = []string{
		"Small", "Medium", "Large", "Extra Large", "Compact", "Expanded", "Basic", "Advanced",
		"Premium", "Standard", "Custom", "Regular", "Special", "Limited", "Unlimited",
	}

	sampleCategories = []string{
		"Primary", "Secondary", "Tertiary", "Quaternary", "Quinary", "Senary", "Septenary",
		"Octonary", "Nonary", "Denary",
	}

	sampleTypes = []string{
		"Type A", "Type B", "Type C", "Type D", "Type E", "Type F", "Type G", "Type H",
		"Type I", "Type J",
	}

	sampleRatings = []int{1, 2, 3, 4, 5}

	sampleStatuses = []string{
		"Active", "Inactive", "Pending", "Archived", "Draft",
	}

	samplePriorities = []string{
		"Low", "Medium", "High", "Critical",
	}

	sampleRegions = []string{
		"North", "South", "East", "West", "Central",
	}

	sampleDepartments = []string{
		"Sales", "Marketing", "Engineering", "Support", "Finance", "HR",
	}
)

// Helper functions
func getRandomItem(items interface{}) interface{} {
	switch v := items.(type) {
	case []string:
		return v[rand.Intn(len(v))]
	case []int:
		return v[rand.Intn(len(v))]
	default:
		return nil
	}
}

func getRandomItems(items []string, minItems, maxItems int) []string {
	numItems := rand.Intn(maxItems-minItems+1) + minItems
	result := make([]string, 0, numItems)
	
	// Create a copy of the items to shuffle
	shuffled := make([]string, len(items))
	copy(shuffled, items)
	
	// Fisher-Yates shuffle
	for i := len(shuffled) - 1; i > 0; i-- {
		j := rand.Intn(i + 1)
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	}
	
	return shuffled[:numItems]
}

func generateRandomKey(length int) string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
	result := make([]byte, length)
	for i := 0; i < length; i++ {
		result[i] = chars[rand.Intn(len(chars))]
	}
	return string(result)
}

func getRandomNumber(min, max float64, decimals int) float64 {
	value := min + rand.Float64()*(max-min)
	factor := float64(1)
	for i := 0; i < decimals; i++ {
		factor *= 10
	}
	return float64(int(value*factor)) / factor
}

// Generate vector data
func generateVectorData(limit, dimensions int) []VectorItem {
	// Generate cluster centers (one per possible cluster)
	clusterCenters := make([][]float64, len(sampleClusters))
	for i := range clusterCenters {
		clusterCenters[i] = make([]float64, dimensions)
		for j := range clusterCenters[i] {
			clusterCenters[i][j] = rand.Float64()*2 - 1
		}
	}

	data := make([]VectorItem, 0, limit)

	// Generate points
	for i := 0; i < limit; i++ {
		// Assign 1-3 clusters to this item
		clusters := getRandomItems(sampleClusters, 1, 3)
		
		// Choose primary cluster for vector generation
		primaryClusterIdx := -1
		for idx, cluster := range sampleClusters {
			if cluster == clusters[0] {
				primaryClusterIdx = idx
				break
			}
		}
		
		center := clusterCenters[primaryClusterIdx]

		// Generate a point near the cluster center
		vector := make([]float64, dimensions)
		for j := range center {
			vector[j] = center[j] + (rand.Float64()*0.5 - 0.25)
		}

		// Generate random metadata
		metadata := map[string]interface{}{
			"name":       fmt.Sprintf("%s %s", getRandomItem(sampleAttributes).(string), getRandomItem(sampleNames).(string)),
			"type":       getRandomItem(sampleTypes).(string),
			"category":   getRandomItem(sampleCategories).(string),
			"rating":     getRandomItem(sampleRatings).(int),
			"value":      getRandomNumber(10, 1000, 2),
			"status":     getRandomItem(sampleStatuses).(string),
			"priority":   getRandomItem(samplePriorities).(string),
			"region":     getRandomItem(sampleRegions).(string),
			"department": getRandomItem(sampleDepartments).(string),
			"created":    time.Now().Add(-time.Duration(rand.Intn(365)) * 24 * time.Hour).Format(time.RFC3339),
			"isActive":   rand.Float64() > 0.2,
			"score":      rand.Intn(100) + 1,
			"tags":       getRandomItems(sampleAttributes, 0, 5),
		}

		// Add data point
		data = append(data, VectorItem{
			ID:       strconv.Itoa(i),
			Key:      generateRandomKey(8),
			Vector:   vector,
			Metadata: metadata,
			Clusters: clusters,
		})
	}

	return data
}

// API handlers
func handleVectorData(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	
	// Handle preflight request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
	// Only allow GET requests
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse query parameters
	limitStr := r.URL.Query().Get("limit")
	dimensionsStr := r.URL.Query().Get("dimensions")

	limit := 500 // Default
	if limitStr != "" {
		parsedLimit, err := strconv.Atoi(limitStr)
		if err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	dimensions := 100 // Default
	if dimensionsStr != "" {
		parsedDimensions, err := strconv.Atoi(dimensionsStr)
		if err == nil && parsedDimensions > 0 {
			dimensions = parsedDimensions
		}
	}

	// Generate data
	data := generateVectorData(limit, dimensions)

	// Return response
	w.Header().Set("Content-Type", "application/json")
	response := VectorDataResponse{
		Data:  data,
		Total: len(data),
	}
	
	json.NewEncoder(w).Encode(response)
}

func main() {
	// Seed the random number generator
	rand.Seed(time.Now().UnixNano())

	// Define API routes
	http.HandleFunc("/api/vectors", handleVectorData)

	// Start server
	port := 8080
	fmt.Printf("Server starting on port %d...\n", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), nil))
}

