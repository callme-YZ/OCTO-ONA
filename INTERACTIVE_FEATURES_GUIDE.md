# Interactive Dashboard Features Guide

## 🎯 New Features (v1.2.1)

### 1. Network Graph Layout Switching

**Location:** Network Graph section header  
**Control:** Button Group (Force / Circular / Radial)

#### Layouts:

1. **Force-Directed (Default)**
   - Physics-based simulation
   - Nodes repel each other
   - Connected nodes attract
   - Best for: Discovering clusters and communities

2. **Circular**
   - All nodes arranged in a circle
   - Connections shown as lines across
   - Best for: Seeing all nodes at once

3. **Radial**
   - Central node with connections radiating outward
   - (Currently uses circular as approximation)
   - Best for: Hub-and-spoke patterns

**How to use:**
- Click any button to switch layout
- Active layout highlighted in purple
- Graph automatically re-renders

---

### 2. Node Ranking Sort Dimensions

**Location:** Hub Score Rankings section header  
**Control:** Dropdown menu (Sort by:)

#### Dimensions:

1. **Hub Score** (Default)
   - ONA metric: 被@数 / 发送数
   - Higher = More influential
   - ∞ = Pure receiver (no sent messages)

2. **Sent Messages**
   - Total messages sent by node
   - Measures output activity

3. **Received Messages (被提及数)**
   - Total messages received/mentioned
   - Measures popularity/attention

4. **Node Degree**
   - Total connections (in + out)
   - Measures network reach

5. **Group Count**
   - Number of unique groups participated
   - Measures breadth of engagement

**How to use:**
- Select dimension from dropdown
- Chart updates to show top 10 nodes
- Bar colors still reflect connoisseur layers

---

## 🎨 Visual Design

### Button Group
- White background by default
- Purple (#667eea) when active
- Smooth hover effects
- Shadow for depth

### Dropdown
- Clean modern style
- Focus highlight on selection
- Matches overall theme

### Responsive
- Mobile-friendly
- Controls stack vertically on small screens
- Charts remain readable

---

## 🧪 Testing Instructions

### Manual Test 1: Layout Switching
1. Open demo-dashboard.html
2. Scroll to Network Graph
3. Click "Circular" button
   - ✅ Layout changes to circle
   - ✅ Button turns purple
   - ✅ Graph re-renders smoothly
4. Click "Force" to return
   - ✅ Nodes redistribute with physics
   - ✅ "Force" button highlighted

### Manual Test 2: Sort Dimensions
1. Open demo-dashboard.html
2. Find Hub Score Rankings chart
3. Select "Sent Messages" from dropdown
   - ✅ Chart re-sorts by sent count
   - ✅ Y-axis label updates
   - ✅ Values change to integers
4. Try other dimensions
   - ✅ Each shows different top 10
   - ✅ Colors remain layer-based

### Manual Test 3: External Data Mode
1. Open demo-dashboard-external/index.html
2. Verify same features exist
3. Check browser console
   - ✅ "Dashboard data loaded" message
   - ✅ No errors

---

## 📊 Data Flow

```
dashboard-generator.ts
  ↓
Calculates metrics
  ↓
Passes to template (EJS)
  ↓
Template injects data into JS
  ↓
Client-side calculations:
  - sentMessages per node
  - receivedMessages per node
  - groupCount per node
  ↓
User interactions:
  - Layout button click → updateNetworkGraph()
  - Sort dropdown change → updateHubScoreChart()
  ↓
ECharts re-renders
```

---

## 🔧 Technical Details

### Added JavaScript Functions

**Inline Template (dashboard-template.html):**
- `updateHubScoreChart()` - Re-renders bar chart with new sort
- `updateNetworkGraph()` - Applies layout and re-renders graph
- Event listeners for buttons and dropdown

**External Template (dashboard-template-external.html):**
- `prepareMetrics()` - Calculates all dimensions from raw data
- `setupEventListeners()` - Attaches click/change handlers
- Same update functions as inline mode

### File Size Impact
- Inline mode: +~6KB JavaScript
- External mode: +~8KB JavaScript (includes metric calculations)
- CSS: +~2KB for controls styling

### Browser Compatibility
- Requires ES6+ (const, arrow functions, Set)
- Works in all modern browsers
- No external dependencies beyond ECharts

---

## 🚀 Future Enhancements (Ideas)

1. **More Layouts**
   - Grid layout
   - Hierarchical tree
   - True radial with degree-based radius

2. **More Sort Dimensions**
   - Betweenness centrality
   - Clustering coefficient
   - Message velocity (msgs/day)

3. **Animation**
   - Smooth layout transitions
   - Animated bar chart updates

4. **Persistence**
   - Save user preferences to localStorage
   - Remember last selected layout/dimension

---

**Generated:** 2026-03-22  
**Version:** OCTO-ONA v1.2.1  
**Author:** Mayo 🥚
